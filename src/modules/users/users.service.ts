import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import * as argon2 from '@node-rs/argon2';
import { BookEntity } from 'src/core/entities/book.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserRole } from 'src/core/enums/user-role.enum';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { BooksService } from 'src/modules/books/books.service';
import {
  CartBookDto,
  CartResponseDto,
  FavoriteBookDto,
  FavoritesResponseDto,
  UpdateUserResponseDto,
  UserAdminViewDto,
  UserPublicViewDto,
} from 'src/modules/users/dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: EntityRepository<UserEntity>,
    @InjectRepository(BookEntity)
    private readonly books: EntityRepository<BookEntity>,
    @InjectRepository(FavoriteEntity)
    private readonly favorites: EntityRepository<FavoriteEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cartItems: EntityRepository<CartItemEntity>,
    private readonly booksService: BooksService,
  ) {}

  async findAll(username?: string): Promise<UserAdminViewDto[]> {
    const users = await this.users.find(
      username ? { username: { $ilike: `%${username.trim()}%` } } : {},
      { orderBy: { username: 'ASC' } },
    );
    return users.map((user) => this.toAdminView(user));
  }

  async findById(id: number): Promise<UserPublicViewDto> {
    const user = await this.users.findOne({ ID: id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.toPublicView(user);
  }

  async update(
    id: number,
    currentUser: AuthenticatedUser,
    input: UpdateUserDto,
  ): Promise<UpdateUserResponseDto> {
    this.assertOwnerOrAdmin(id, currentUser);
    const user = await this.requireUser(id);
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (input.email && input.email.toLowerCase() !== user.email) {
      const existing = await this.users.findOne({
        email: input.email.toLowerCase(),
      });
      if (existing) {
        throw new ConflictException('Email is already registered');
      }
    }
    if (input.username && input.username.toLowerCase() !== user.username) {
      const existing = await this.users.findOne({
        username: input.username.toLowerCase(),
      });
      if (existing) {
        throw new ConflictException('Username is already registered');
      }
    }
    if (input.newPassword) {
      if (!isAdmin) {
        if (!input.password || !user.passwordHash) {
          throw new UnauthorizedException('Current password is required');
        }
        const valid = await argon2.verify(user.passwordHash, input.password);
        if (!valid) {
          throw new UnauthorizedException('Check your current password');
        }
      }
      user.passwordHash = await argon2.hash(input.newPassword);
    }
    if (input.username) user.username = input.username.trim().toLowerCase();
    if (input.email) user.email = input.email.trim().toLowerCase();
    if (input.name) user.name = input.name.trim();
    if (input.surname) user.surname = input.surname.trim();
    if (input.profilePic !== undefined) user.profilePic = input.profilePic;
    await this.users.getEntityManager().flush();
    return {
      message: 'User modified successfully',
      data: this.toPublicView(user),
    };
  }

  async setStatus(
    id: number,
    action: 'suspended' | 'enabled' | 'admin',
  ): Promise<UserAdminViewDto> {
    const user = await this.requireUser(id);
    if (action === 'suspended') {
      user.suspendedTimes += 1;
      user.dateSuspended = new Date();
      if (user.suspendedTimes >= 3) {
        user.banned = true;
        user.enabled = false;
      } else {
        user.enabled = false;
      }
    } else if (action === 'enabled') {
      user.enabled = true;
      user.banned = false;
    } else {
      user.role = user.role === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
    }
    await this.users.getEntityManager().flush();
    return this.toAdminView(user);
  }

  async ban(id: number): Promise<{ message: string }> {
    const user = await this.requireUser(id);
    user.banned = true;
    user.enabled = false;
    await this.users.getEntityManager().flush();
    return { message: 'User banned successfully' };
  }

  async getFavorites(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<FavoriteBookDto[]> {
    this.assertOwnerOrAdmin(id, currentUser);
    const rows = await this.favorites.find(
      { user: { ID: id } },
      {
        populate: ['book', 'book.authors', 'book.categories'],
        orderBy: { createdAt: 'DESC' },
      },
    );
    return rows.map((row) => ({
      ...this.booksService.toView(row.book),
      user_bookfav: { createdAt: row.createdAt },
    }));
  }

  async addFavorite(
    id: number,
    bookId: number,
    currentUser: AuthenticatedUser,
  ): Promise<FavoritesResponseDto> {
    this.assertOwnerOrAdmin(id, currentUser);
    const user = await this.requireUser(id);
    const book = await this.requireBook(bookId);
    const existing = await this.favorites.findOne({ user, book });
    if (!existing) {
      await this.favorites.create({ user, book });
      await this.favorites.getEntityManager().flush();
    }
    return {
      data: await this.getFavorites(id, currentUser),
      message: 'Favorite added successfully',
    };
  }

  async removeFavorite(
    id: number,
    bookId: number,
    currentUser: AuthenticatedUser,
  ): Promise<FavoritesResponseDto> {
    this.assertOwnerOrAdmin(id, currentUser);
    const existing = await this.favorites.findOne({
      user: { ID: id },
      book: { ID: bookId },
    });
    if (existing) {
      await this.favorites.getEntityManager().remove(existing).flush();
    }
    return {
      data: await this.getFavorites(id, currentUser),
      message: 'Favorite deleted successfully',
    };
  }

  async getCart(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<CartBookDto[]> {
    this.assertOwnerOrAdmin(id, currentUser);
    const rows = await this.cartItems.find(
      { user: { ID: id } },
      {
        populate: ['book', 'book.authors', 'book.categories'],
        orderBy: { createdAt: 'DESC' },
      },
    );
    return rows.map((row) => ({
      ...this.booksService.toView(row.book),
      user_bookcart: { createdAt: row.createdAt },
    }));
  }

  async addCartItem(
    id: number,
    bookId: number,
    currentUser: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    this.assertOwnerOrAdmin(id, currentUser);
    const user = await this.requireUser(id);
    const book = await this.requireBook(bookId);
    const existing = await this.cartItems.findOne({ user, book });
    if (!existing) {
      await this.cartItems.create({ user, book });
      await this.cartItems.getEntityManager().flush();
    }
    return {
      data: await this.getCart(id, currentUser),
      message: 'Item added successfully',
    };
  }

  async removeCartItem(
    id: number,
    bookId: number,
    currentUser: AuthenticatedUser,
  ): Promise<CartResponseDto> {
    this.assertOwnerOrAdmin(id, currentUser);
    const existing = await this.cartItems.findOne({
      user: { ID: id },
      book: { ID: bookId },
    });
    if (existing) {
      await this.cartItems.getEntityManager().remove(existing).flush();
    }
    return {
      data: await this.getCart(id, currentUser),
      message: 'Item deleted successfully',
    };
  }

  async usernames(): Promise<string[]> {
    const rows = await this.users.findAll({ fields: ['username'] });
    return rows.map((user) => user.username);
  }

  async emails(): Promise<string[]> {
    const rows = await this.users.findAll({ fields: ['email'] });
    return rows.map((user) => user.email);
  }

  async userByUsername(username: string): Promise<UserPublicViewDto[]> {
    const rows = await this.users.find(
      { username: { $ilike: `%${username.trim()}%` } },
      { orderBy: { username: 'ASC' } },
    );
    return rows.map((user) => this.toPublicView(user));
  }

  toPublicView(user: UserEntity): UserPublicViewDto {
    return {
      ID: user.ID,
      username: user.username,
      name: user.name,
      surname: user.surname,
      profilePic: user.profilePic,
      role: user.role,
      admin: user.role === UserRole.ADMIN,
      enabled: user.enabled,
      banned: user.banned,
      suspendedTimes: user.suspendedTimes,
      createdAt: user.createdAt,
    };
  }

  toAdminView(user: UserEntity): UserAdminViewDto {
    return { ...this.toPublicView(user), email: user.email };
  }

  private async requireUser(id: number): Promise<UserEntity> {
    const user = await this.users.findOne({ ID: id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  private async requireBook(id: number): Promise<BookEntity> {
    const book = await this.books.findOne({ ID: id });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return book;
  }

  private assertOwnerOrAdmin(id: number, currentUser: AuthenticatedUser): void {
    if (currentUser.ID !== id && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You may only access your own account');
    }
  }
}

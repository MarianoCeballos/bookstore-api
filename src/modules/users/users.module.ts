import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BooksModule } from 'src/modules/books/books.module';
import { BookEntity } from 'src/core/entities/book.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserLookupsController } from 'src/modules/users/user-lookups.controller';
import { UsersController } from 'src/modules/users/users.controller';
import { UsersService } from 'src/modules/users/users.service';

@Module({
  imports: [
    AuthModule,
    BooksModule,
    MikroOrmModule.forFeature([BookEntity, CartItemEntity, FavoriteEntity, UserEntity]),
  ],
  controllers: [UserLookupsController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}

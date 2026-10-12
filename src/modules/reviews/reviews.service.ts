import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BookEntity } from 'src/core/entities/book.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserRole } from 'src/core/enums/user-role.enum';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { BooksService } from 'src/modules/books/books.service';
import { CreateReviewDto } from 'src/modules/reviews/dto/create-review.dto';
import { UpdateReviewDto } from 'src/modules/reviews/dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviews: EntityRepository<ReviewEntity>,
    @InjectRepository(ReviewReportEntity)
    private readonly reports: EntityRepository<ReviewReportEntity>,
    @InjectRepository(BookEntity)
    private readonly books: EntityRepository<BookEntity>,
    @InjectRepository(UserEntity)
    private readonly users: EntityRepository<UserEntity>,
    private readonly booksService: BooksService,
  ) {}

  async findAll(): Promise<Array<Record<string, unknown>>> {
    const reviews = await this.reviews.findAll({
      populate: ['book', 'user', 'reports', 'reports.user'],
      orderBy: { createdAt: 'DESC' },
    });
    return reviews.map((review) => this.toView(review));
  }

  async findByBook(id: number): Promise<Record<string, unknown>> {
    const book = await this.books.findOne(
      { ID: id },
      { populate: ['authors', 'categories', 'reviews', 'reviews.user', 'reviews.reports', 'reviews.reports.user'] },
    );
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    return {
      ...this.booksService.toView(book),
      reviews: book.reviews.getItems().map((review) => this.toView(review)),
    };
  }

  async findByUser(id: number): Promise<Record<string, unknown>> {
    const user = await this.users.findOne(
      { ID: id },
      { populate: ['reviews', 'reviews.book', 'reviews.user', 'reviews.reports', 'reviews.reports.user'] },
    );
    if (!user) {
      throw new NotFoundException(`User not found with id ${id}`);
    }
    return {
      ID: user.ID,
      username: user.username,
      name: user.name,
      surname: user.surname,
      profilePic: user.profilePic,
      reviews: user.reviews.getItems().map((review) => this.toView(review)),
    };
  }

  async create(
    input: CreateReviewDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ message: string }> {
    const user = await this.users.findOne({ ID: currentUser.ID });
    const book = await this.books.findOne({ ID: input.bookID });
    if (!user || !book) {
      throw new NotFoundException('User or book not found');
    }
    const review = this.reviews.create({
      title: input.title.trim(),
      review: input.review.trim(),
      rating: input.rating,
      user,
      book,
    });
    await this.reviews.getEntityManager().persistAndFlush(review);
    await this.updateRating(book.ID);
    return { message: 'Review created successfully' };
  }

  async update(
    id: number,
    input: UpdateReviewDto,
    currentUser: AuthenticatedUser,
    report: boolean,
  ): Promise<{ message: string }> {
    const review = await this.reviews.findOne(
      { ID: id },
      { populate: ['book'] },
    );
    if (!review) {
      throw new NotFoundException(`Review not found with id ${id}`);
    }
    if (report) {
      if (review.user.ID === currentUser.ID) {
        throw new ForbiddenException('You cannot report your own review');
      }
      const existing = await this.reports.findOne({
        review: { ID: id },
        user: { ID: currentUser.ID },
      });
      if (existing) {
        throw new ConflictException('You have already reported this review');
      }
      const user = await this.users.findOne({ ID: currentUser.ID });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.reports.create({ review, user });
      await this.reports.getEntityManager().flush();
      return { message: 'Review modified successfully' };
    }
    if (review.user.ID !== currentUser.ID && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You may only edit your own reviews');
    }
    if (input.title !== undefined) review.title = input.title.trim();
    if (input.review !== undefined) review.review = input.review.trim();
    if (input.rating !== undefined) review.rating = input.rating;
    await this.reviews.getEntityManager().flush();
    await this.updateRating(review.book.ID);
    return { message: 'Review modified successfully' };
  }

  async delete(id: number, currentUser: AuthenticatedUser): Promise<{ message: string }> {
    const review = await this.reviews.findOne(
      { ID: id },
      { populate: ['book'] },
    );
    if (!review) {
      throw new NotFoundException(`Review not found with id ${id}`);
    }
    if (review.user.ID !== currentUser.ID && currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You may only delete your own reviews');
    }
    const bookId = review.book.ID;
    await this.reviews.getEntityManager().removeAndFlush(review);
    await this.updateRating(bookId);
    return { message: 'Review deleted successfully' };
  }

  private async updateRating(bookId: number): Promise<void> {
    const book = await this.books.findOne(
      { ID: bookId },
      { populate: ['reviews'] },
    );
    if (!book) {
      throw new NotFoundException(`Book not found with id ${bookId}`);
    }
    const ratings = book.reviews.getItems().map((review) => review.rating);
    book.rating = ratings.length
      ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length).toFixed(1)
      : '0.0';
    await this.books.getEntityManager().flush();
  }

  private toView(review: ReviewEntity): Record<string, unknown> {
    return {
      ID: review.ID,
      title: review.title,
      review: review.review,
      rating: review.rating,
      createdAt: review.createdAt,
      bookID: review.book.ID,
      userID: review.user.ID,
      book: {
        ID: review.book.ID,
        title: review.book.title,
        image: review.book.image,
      },
      user: {
        ID: review.user.ID,
        username: review.user.username,
        profilePic: review.user.profilePic,
      },
      reports: review.reports.isInitialized()
        ? review.reports.getItems().map((report) => report.user.ID)
        : [],
    };
  }
}

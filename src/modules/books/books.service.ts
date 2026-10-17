import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, FilterQuery } from '@mikro-orm/postgresql';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { DEFAULT_PAGE_SIZE } from 'src/core/constants/api.constants';
import { CreateBookDto } from 'src/modules/books/dto/create-book.dto';
import { BookQueryDto } from 'src/modules/books/dto/book-query.dto';

const escapeLike = (value: string): string =>
  value.trim().replace(/[\\%_]/g, '\\$&');

export interface ReviewView {
  ID: ReviewEntity['ID'];
  title: ReviewEntity['title'];
  review: ReviewEntity['review'];
  rating: ReviewEntity['rating'];
  createdAt: ReviewEntity['createdAt'];
  bookID: number;
  userID: number;
  user: {
    ID: number;
    username: ReviewEntity['user']['username'];
    profilePic: ReviewEntity['user']['profilePic'];
  };
  reports: number[];
}

export interface BookView {
  ID: BookEntity['ID'];
  title: BookEntity['title'];
  description: BookEntity['description'];
  price: string;
  image: BookEntity['image'];
  authors: string[];
  categories: string[];
  publisher: BookEntity['publisher'];
  publishedDate: BookEntity['publishedDate'];
  pageCount: BookEntity['pageCount'];
  rating: number;
  language: BookEntity['language'];
  avgReadingTime: BookEntity['avgReadingTime'];
  soldCopies: BookEntity['soldCopies'];
  reviews: ReviewView[];
  createdAt: BookEntity['createdAt'];
}

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(BookEntity)
    private readonly books: EntityRepository<BookEntity>,
    @InjectRepository(AuthorEntity)
    private readonly authors: EntityRepository<AuthorEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: EntityRepository<CategoryEntity>,
  ) {}

  async findAll(query: BookQueryDto): Promise<BookView[]> {
    const where: FilterQuery<BookEntity> = {};
    if (query.title?.trim()) {
      where.title = { $ilike: `%${escapeLike(query.title)}%` };
    }
    if (query.author?.trim()) {
      where.authors = { name: { $ilike: `%${escapeLike(query.author)}%` } };
    }
    if (query.category?.trim()) {
      where.categories = {
        category: { $ilike: `%${escapeLike(query.category)}%` },
      };
    }
    const options = {
      populate: [
        'authors',
        'categories',
        'reviews',
        'reviews.user',
        'reviews.reports',
      ] as const,

      orderBy: { title: 'ASC' as const },
      ...(query.page || query.pageSize
        ? {
            limit: query.pageSize ?? DEFAULT_PAGE_SIZE,
            offset:
              ((query.page ?? 1) - 1) * (query.pageSize ?? DEFAULT_PAGE_SIZE),
          }
        : {}),
    };
    const books: BookEntity[] = await this.books.find(where, options);
    return books.map((book) => this.toView(book));
  }

  async findById(id: number): Promise<BookView> {
    const book = await this.books.findOne(
      { ID: id },
      {
        populate: [
          'authors',
          'categories',
          'reviews',
          'reviews.user',
          'reviews.reports',
        ] as const,
      },
    );
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    return this.toView(book);
  }

  async homeBooks(): Promise<{
    bestSellers: BookView[];
    mostPopular: BookView[];
    newReleases: BookView[];
  }> {
    const books = await this.books.find(
      {},
      { populate: ['authors', 'categories'], orderBy: { title: 'ASC' } },
    );
    const map = (book: BookEntity) => this.toView(book);
    return {
      bestSellers: [...books]
        .sort((left, right) => right.soldCopies - left.soldCopies)
        .slice(0, 30)
        .map(map),
      mostPopular: [...books]
        .sort(
          (left, right) => Number(right.rating ?? 0) - Number(left.rating ?? 0),
        )
        .slice(0, 30)
        .map(map),
      newReleases: [...books]
        .sort(
          (left, right) =>
            new Date(right.publishedDate ?? 0).getTime() -
            new Date(left.publishedDate ?? 0).getTime(),
        )
        .slice(0, 15)
        .map(map),
    };
  }

  async create(input: CreateBookDto): Promise<{ message: string }> {
    const title = input.title.trim();
    const existingBook = await this.books.findOne({
      title: { $ilike: escapeLike(title) },
    });
    if (existingBook) {
      throw new ConflictException('Book title already exists');
    }
    const authors = await this.resolveAuthors(input.authors);
    const categories = await this.resolveCategories(input.categories);
    const book = this.books.create({
      title,
      description: input.description.trim(),
      price: this.normalizePrice(input.price),
      image: input.image?.trim() || undefined,
      publisher: input.publisher?.trim() || undefined,
      publishedDate: input.publishedDate?.trim() || undefined,
      pageCount: input.pageCount,
      language: input.language?.trim() || undefined,
      rating: '0',
      avgReadingTime: this.readingTime(input.pageCount),
    });
    book.authors.add(authors);
    book.categories.add(categories);
    await this.books
      .getEntityManager()
      .persist([...authors, ...categories, book])
      .flush();
    return { message: 'Book created successfully' };
  }

  async update(id: number, input: CreateBookDto): Promise<{ message: string }> {
    const book = await this.books.findOne({ ID: id });
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    const title = input.title.trim();
    const duplicate = await this.books.findOne({
      ID: { $ne: id },
      title: { $ilike: escapeLike(title) },
    });
    if (duplicate) {
      throw new ConflictException('Book title already exists');
    }
    const authors = await this.resolveAuthors(input.authors);
    const categories = await this.resolveCategories(input.categories);
    book.title = title;
    book.description = input.description.trim();
    book.price = this.normalizePrice(input.price);
    book.image = input.image?.trim() || undefined;
    book.publisher = input.publisher?.trim() || undefined;
    book.publishedDate = input.publishedDate?.trim() || undefined;
    book.pageCount = input.pageCount;
    book.language = input.language?.trim() || undefined;
    book.avgReadingTime = this.readingTime(input.pageCount);
    book.authors.set(authors);
    book.categories.set(categories);
    await this.books
      .getEntityManager()
      .persist([...authors, ...categories, book])
      .flush();
    return { message: 'Book modified successfully' };
  }

  private async resolveAuthors(
    items: CreateBookDto['authors'],
  ): Promise<AuthorEntity[]> {
    const uniqueNames = new Map<string, string>();
    for (const item of items) {
      const trimmed = item.value.trim();
      if (trimmed && !uniqueNames.has(trimmed.toLowerCase())) {
        uniqueNames.set(trimmed.toLowerCase(), trimmed);
      }
    }
    return Promise.all(
      Array.from(uniqueNames.values()).map(async (name) => {
        const existing = await this.authors.findOne({
          name: { $ilike: escapeLike(name) },
        });
        return existing ?? this.authors.create({ name });
      }),
    );
  }

  private async resolveCategories(
    items: CreateBookDto['categories'],
  ): Promise<CategoryEntity[]> {
    const uniqueCategories = new Map<string, string>();
    for (const item of items) {
      const trimmed = item.value.trim();
      if (trimmed && !uniqueCategories.has(trimmed.toLowerCase())) {
        uniqueCategories.set(trimmed.toLowerCase(), trimmed);
      }
    }
    return Promise.all(
      Array.from(uniqueCategories.values()).map(async (category) => {
        const existing = await this.categories.findOne({
          category: { $ilike: escapeLike(category) },
        });
        return existing ?? this.categories.create({ category });
      }),
    );
  }

  async delete(id: number): Promise<{ message: string }> {
    const book = await this.books.findOne({ ID: id });
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    await this.books.getEntityManager().remove(book).flush();
    return { message: `Book with id ${id} deleted successfully` };
  }

  async findAuthor(name: string): Promise<AuthorEntity | null> {
    return this.authors.findOne({ name });
  }

  async findCategory(name: string): Promise<CategoryEntity | null> {
    return this.categories.findOne({ category: name });
  }

  toView(book: BookEntity): BookView {
    const reviews: ReviewView[] = book.reviews.isInitialized()
      ? book.reviews.getItems().map((review: ReviewEntity) => ({
          ID: review.ID,
          title: review.title,
          review: review.review,
          rating: review.rating,
          createdAt: review.createdAt,
          bookID: review.book.ID,
          userID: review.user.ID,
          user: {
            ID: review.user.ID,
            username: review.user.username,
            profilePic: review.user.profilePic,
          },
          reports: review.reports.isInitialized()
            ? review.reports.getItems().map((report) => report.user.ID)
            : [],
        }))
      : [];
    return {
      ID: book.ID,
      title: book.title,
      description: book.description,
      price: this.normalizePrice(book.price),
      image: book.image,
      authors: book.authors.getItems().map((author) => author.name),
      categories: book.categories
        .getItems()
        .map((category) => category.category),
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      pageCount: book.pageCount,
      rating: Number(book.rating ?? 0),
      language: book.language,
      avgReadingTime: book.avgReadingTime,
      soldCopies: book.soldCopies,
      reviews,
      createdAt: book.createdAt,
    };
  }

  normalizePrice(price: string): string {
    const [whole = '0', fraction = ''] = price.split('.');
    return `${BigInt(whole)}.${fraction.padEnd(2, '0').slice(0, 2)}`;
  }

  private readingTime(pageCount?: number): string {
    if (!pageCount) {
      return 'Cannot estimate reading time';
    }
    const minutes = (300 * pageCount) / 250;
    const hours = Math.trunc(minutes / 60);
    const remainingMinutes = Math.round(minutes - hours * 60);
    return `${hours} hs and ${remainingMinutes} minutes`;
  }
}

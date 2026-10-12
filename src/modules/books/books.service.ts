import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@mikro-orm/nestjs";
import { EntityRepository, FilterQuery } from "@mikro-orm/postgresql";
import { AuthorEntity } from "src/core/entities/author.entity";
import { BookEntity } from "src/core/entities/book.entity";
import { CategoryEntity } from "src/core/entities/category.entity";
import { ReviewEntity } from "src/core/entities/review.entity";
import { DEFAULT_PAGE_SIZE } from "src/core/constants/api.constants";
import { CreateBookDto } from "src/modules/books/dto/create-book.dto";
import { BookQueryDto } from "src/modules/books/dto/book-query.dto";

const escapeLike = (value: string): string =>
  value.trim().replace(/[\\%_]/g, "\\$&");

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

  async findAll(query: BookQueryDto): Promise<unknown[]> {
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
        "authors",
        "categories",
        "reviews",
        "reviews.user",
        "reviews.reports",
      ] as const,
      orderBy: { title: "ASC" as const },
      ...(query.page || query.pageSize
        ? {
            limit: query.pageSize ?? DEFAULT_PAGE_SIZE,
            offset:
              ((query.page ?? 1) - 1) * (query.pageSize ?? DEFAULT_PAGE_SIZE),
          }
        : {}),
    };
    const books = await this.books.find(where, options);
    return books.map((book) => this.toView(book));
  }

  async findById(id: number): Promise<Record<string, unknown>> {
    const book = await this.books.findOne(
      { ID: id },
      {
        populate: [
          "authors",
          "categories",
          "reviews",
          "reviews.user",
          "reviews.reports",
        ] as const,
      },
    );
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    return this.toView(book);
  }

  async homeBooks(): Promise<{
    bestSellers: unknown[];
    mostPopular: unknown[];
    newReleases: unknown[];
  }> {
    const books = await this.books.find(
      {},
      { populate: ["authors", "categories"], orderBy: { title: "ASC" } },
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
    const title = input.title.trim().toLowerCase();
    if (await this.books.findOne({ title: { $ilike: title } })) {
      throw new ConflictException("Book title already exists");
    }
    const authors = await Promise.all(
      input.authors.map((item) =>
        this.authors
          .findOne({ name: item.value.trim() })
          .then(
            (existing) =>
              existing ?? this.authors.create({ name: item.value.trim() }),
          ),
      ),
    );
    const categories = await Promise.all(
      input.categories.map((item) =>
        this.categories
          .findOne({ category: item.value.trim() })
          .then(
            (existing) =>
              existing ??
              this.categories.create({ category: item.value.trim() }),
          ),
      ),
    );
    const book = this.books.create({
      title,
      description: input.description.trim(),
      price: this.normalizePrice(input.price),
      image: input.image,
      publisher: input.publisher,
      publishedDate: input.publishedDate,
      pageCount: input.pageCount,
      language: input.language,
      rating: "0",
      avgReadingTime: this.readingTime(input.pageCount),
    });
    book.authors.add(authors);
    book.categories.add(categories);
    await this.books
      .getEntityManager()
      .persistAndFlush([...authors, ...categories, book]);
    return { message: "Book created successfully" };
  }

  async update(id: number, input: CreateBookDto): Promise<{ message: string }> {
    const book = await this.books.findOne({ ID: id });
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    const authors = await Promise.all(
      input.authors.map(async (item) => {
        const name = item.value.trim();
        return (
          (await this.authors.findOne({ name })) ??
          this.authors.create({ name })
        );
      }),
    );
    const categories = await Promise.all(
      input.categories.map(async (item) => {
        const category = item.value.trim();
        return (
          (await this.categories.findOne({ category })) ??
          this.categories.create({ category })
        );
      }),
    );
    book.title = input.title.trim().toLowerCase();
    book.description = input.description.trim();
    book.price = this.normalizePrice(input.price);
    book.image = input.image;
    book.publisher = input.publisher;
    book.publishedDate = input.publishedDate;
    book.pageCount = input.pageCount;
    book.language = input.language;
    book.avgReadingTime = this.readingTime(input.pageCount);
    book.authors.set(authors);
    book.categories.set(categories);
    await this.books
      .getEntityManager()
      .persistAndFlush([...authors, ...categories, book]);
    return { message: "Book modified successfully" };
  }

  async delete(id: number): Promise<{ message: string }> {
    const book = await this.books.findOne({ ID: id });
    if (!book) {
      throw new NotFoundException(`Book not found with id ${id}`);
    }
    await this.books.getEntityManager().removeAndFlush(book);
    return { message: `Book with id ${id} deleted successfully` };
  }

  async findAuthor(name: string): Promise<AuthorEntity | null> {
    return this.authors.findOne({ name });
  }

  async findCategory(name: string): Promise<CategoryEntity | null> {
    return this.categories.findOne({ category: name });
  }

  toView(book: BookEntity): Record<string, unknown> {
    const reviews = book.reviews.isInitialized()
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
    const [whole = "0", fraction = ""] = price.split(".");
    return `${BigInt(whole)}.${fraction.padEnd(2, "0").slice(0, 2)}`;
  }

  private readingTime(pageCount?: number): string {
    if (!pageCount) {
      return "Cannot estimate reading time";
    }
    const minutes = (300 * pageCount) / 250;
    const hours = Math.trunc(minutes / 60);
    const remainingMinutes = Math.round(minutes - hours * 60);
    return `${hours} hs and ${remainingMinutes} minutes`;
  }
}

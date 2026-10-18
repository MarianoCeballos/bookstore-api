import { ConflictException } from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/postgresql';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { BooksService } from 'src/modules/books/books.service';

describe('BooksService', () => {
  it('returns book prices as decimal strings', () => {
    const service = new BooksService(
      {} as EntityRepository<BookEntity>,
      {} as EntityRepository<AuthorEntity>,
      {} as EntityRepository<CategoryEntity>,
    );
    const book = Object.assign(new BookEntity(), {
      ID: 1,
      title: 'Sample Ebook',
      description: 'A sample description.',
      price: '19.90',
      rating: '4.5',
      soldCopies: 0,
    });
    expect(service.toView(book)).toMatchObject({
      ID: 1,
      price: '19.90',
      authors: [],
      categories: [],
    });
  });

  it('preserves book title casing while deduplicating authors and categories on create', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const persist = jest.fn().mockReturnValue({ flush });
    const em = { persist, flush };
    const createBook = jest.fn((data: Partial<BookEntity>) =>
      Object.assign(new BookEntity(), { ID: 42 }, data, {
        authors: { add: jest.fn(), set: jest.fn() },
        categories: { add: jest.fn(), set: jest.fn() },
      }),
    );
    const booksRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: createBook,
      getEntityManager: jest.fn().mockReturnValue(em),
    } as unknown as EntityRepository<BookEntity>;
    const authorsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ name }: { name: string }) =>
        Object.assign(new AuthorEntity(), { name }),
      ),
    } as unknown as EntityRepository<AuthorEntity>;
    const categoriesRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ category }: { category: string }) =>
        Object.assign(new CategoryEntity(), { category }),
      ),
    } as unknown as EntityRepository<CategoryEntity>;

    const service = new BooksService(booksRepo, authorsRepo, categoriesRepo);
    const result = await service.create({
      title: '  The Great Gatsby  ',
      description: '  A classic novel.  ',
      price: '24.5',
      authors: [
        { value: 'F. Scott Fitzgerald' },
        { value: 'f. scott fitzgerald' },
      ],
      categories: [{ value: 'Classics' }, { value: 'CLASSICS' }],
    });

    expect(result).toEqual({ message: 'Book created successfully' });
    expect(createBook).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'The Great Gatsby',
        description: 'A classic novel.',
        price: '24.50',
      }),
    );
    expect(authorsRepo.create).toHaveBeenCalledTimes(1);
    expect(categoriesRepo.create).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate book titles case-insensitively on create', async () => {
    const booksRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          Object.assign(new BookEntity(), { ID: 1, title: 'Dune' }),
        ),
    } as unknown as EntityRepository<BookEntity>;
    const service = new BooksService(
      booksRepo,
      {} as EntityRepository<AuthorEntity>,
      {} as EntityRepository<CategoryEntity>,
    );

    await expect(
      service.create({
        title: 'dune',
        description: 'Sci-fi',
        price: '15.00',
        authors: [{ value: 'Frank Herbert' }],
        categories: [{ value: 'Sci-Fi' }],
      }),
    ).rejects.toThrow('Book title already exists');
  });

  it.each([
    ['books_title_lower_unique', 'Book title already exists'],
    ['authors_name_lower_unique', 'Author name already exists'],
    ['categories_category_lower_unique', 'Category already exists'],
  ])(
    'translates a %s unique-constraint failure into a conflict',
    async (index, message) => {
      const flush = jest
        .fn()
        .mockRejectedValue(
          new UniqueConstraintViolationException(
            new Error(
              `duplicate key value violates unique constraint "${index}"`,
            ),
          ),
        );
      const em = { persist: jest.fn().mockReturnValue({ flush }) };
      const booksRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((data: Partial<BookEntity>) =>
          Object.assign(new BookEntity(), { ID: 9 }, data, {
            authors: { add: jest.fn(), set: jest.fn() },
            categories: { add: jest.fn(), set: jest.fn() },
          }),
        ),
        getEntityManager: jest.fn().mockReturnValue(em),
      } as unknown as EntityRepository<BookEntity>;
      const authorsRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ name }: { name: string }) =>
          Object.assign(new AuthorEntity(), { name }),
        ),
      } as unknown as EntityRepository<AuthorEntity>;
      const categoriesRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ category }: { category: string }) =>
          Object.assign(new CategoryEntity(), { category }),
        ),
      } as unknown as EntityRepository<CategoryEntity>;

      const service = new BooksService(booksRepo, authorsRepo, categoriesRepo);

      await expect(
        service.create({
          title: 'Dune',
          description: 'Sci-fi',
          price: '15.00',
          authors: [{ value: 'Frank Herbert' }],
          categories: [{ value: 'Sci-Fi' }],
        }),
      ).rejects.toThrow(new ConflictException(message));
    },
  );

  it('stores null for explicitly blank optional fields and undefined for omitted ones', async () => {
    const book = Object.assign(new BookEntity(), {
      ID: 7,
      title: 'Dune',
      image: 'data:image/png;base64,abc',
      language: 'English',
      authors: { set: jest.fn() },
      categories: { set: jest.fn() },
    });
    const flush = jest.fn().mockResolvedValue(undefined);
    const booksRepo = {
      findOne: jest.fn().mockResolvedValueOnce(book).mockResolvedValue(null),
      getEntityManager: jest
        .fn()
        .mockReturnValue({ persist: jest.fn().mockReturnValue({ flush }) }),
    } as unknown as EntityRepository<BookEntity>;
    const authorsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ name }: { name: string }) =>
        Object.assign(new AuthorEntity(), { name }),
      ),
    } as unknown as EntityRepository<AuthorEntity>;
    const categoriesRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn(({ category }: { category: string }) =>
        Object.assign(new CategoryEntity(), { category }),
      ),
    } as unknown as EntityRepository<CategoryEntity>;

    const service = new BooksService(booksRepo, authorsRepo, categoriesRepo);
    await service.update(7, {
      title: 'Dune',
      description: 'Sci-fi',
      price: '15.00',
      image: '   ',
      language: '',
      authors: [{ value: 'Frank Herbert' }],
      categories: [{ value: 'Sci-Fi' }],
    });

    expect(book.image).toBeNull();
    expect(book.language).toBeNull();
    // Omitted keys stay `undefined` (the nullable columns end up as NULL).
    expect(book.publisher).toBeUndefined();
    expect(book.publishedDate).toBeUndefined();
  });
});

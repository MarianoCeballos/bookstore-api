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
});

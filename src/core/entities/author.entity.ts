import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';

@Entity({ tableName: 'authors' })
export class AuthorEntity extends BaseEntity {
  @Property({ unique: true })
  name!: string;

  @ManyToMany(() => BookEntity, (book) => book.authors)
  books = new Collection<BookEntity>(this);
}

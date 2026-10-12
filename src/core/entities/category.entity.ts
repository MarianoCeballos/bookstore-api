import { Collection, Entity, ManyToMany, Property } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';

@Entity({ tableName: 'categories' })
export class CategoryEntity extends BaseEntity<'soldCopies'> {
  @Property({ unique: true })
  category!: string;

  @Property({ default: 0 })
  soldCopies = 0;

  @ManyToMany(() => BookEntity, (book) => book.categories)
  books = new Collection<BookEntity>(this);
}

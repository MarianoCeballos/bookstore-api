import {
  Collection,
  Entity,
  ManyToMany,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BaseEntity } from 'src/core/entities/base.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';

@Entity({ tableName: 'books' })
export class BookEntity extends BaseEntity<'soldCopies'> {
  @Property({ length: 1000 })
  title!: string;

  @Property({ type: 'text' })
  description!: string;

  @Property({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Property({ type: 'text', nullable: true })
  image?: string;

  @Property({ nullable: true })
  publisher?: string;

  @Property({ nullable: true })
  publishedDate?: string;

  @Property({ nullable: true })
  pageCount?: number;

  @Property({ nullable: true })
  rating?: string;

  @Property({ nullable: true })
  language?: string;

  @Property({ nullable: true })
  avgReadingTime?: string;

  @Property({ default: 0 })
  soldCopies = 0;

  @ManyToMany(() => AuthorEntity, (author) => author.books, {
    owner: true,
    pivotTable: 'books_authors',
    joinColumn: 'book_id',
    inverseJoinColumn: 'author_id',
  })
  authors = new Collection<AuthorEntity>(this);

  @ManyToMany(() => CategoryEntity, (category) => category.books, {
    owner: true,
    pivotTable: 'books_categories',
    joinColumn: 'book_id',
    inverseJoinColumn: 'category_id',
  })
  categories = new Collection<CategoryEntity>(this);

  @OneToMany(() => ReviewEntity, (review) => review.book)
  reviews = new Collection<ReviewEntity>(this);

  @OneToMany(() => FavoriteEntity, (favorite) => favorite.book)
  favorites = new Collection<FavoriteEntity>(this);

  @OneToMany(() => CartItemEntity, (item) => item.book)
  cartItems = new Collection<CartItemEntity>(this);

  @OneToMany(() => OrderItemEntity, (item) => item.book)
  orderItems = new Collection<OrderItemEntity>(this);
}

import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Entity({ tableName: 'cart_items' })
@Unique({ properties: ['user', 'book'] })
export class CartItemEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user!: UserEntity;

  @ManyToOne(() => BookEntity, { deleteRule: 'cascade' })
  book!: BookEntity;
}

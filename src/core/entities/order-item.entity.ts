import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { OrderEntity } from 'src/core/entities/order.entity';

@Entity({ tableName: 'order_items' })
export class OrderItemEntity extends BaseEntity<'quantity'> {
  @ManyToOne(() => OrderEntity, { deleteRule: 'cascade' })
  order!: OrderEntity;

  @ManyToOne(() => BookEntity, { deleteRule: 'restrict' })
  book!: BookEntity;

  @Property({ length: 1000 })
  title!: string;

  @Property({ type: 'numeric', precision: 12, scale: 2 })
  unitPrice!: string;

  @Property({ default: 1 })
  quantity = 1;
}

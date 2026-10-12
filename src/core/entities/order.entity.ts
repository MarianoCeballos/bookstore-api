import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { OrderStatus } from 'src/core/enums/order-status.enum';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Entity({ tableName: 'orders' })
export class OrderEntity extends BaseEntity<'status' | 'gift'> {
  @Property({ unique: true, nullable: true })
  providerPaymentId?: string;

  @Property({ unique: true, nullable: true })
  providerPreferenceId?: string;

  @Enum({
    items: () => OrderStatus,
    nativeEnumName: 'order_status',
    default: OrderStatus.PENDING,
  })
  status: OrderStatus = OrderStatus.PENDING;

  @Property({ type: 'numeric', precision: 12, scale: 2 })
  total!: string;

  @Property({ default: false })
  gift = false;

  @Property({ nullable: true })
  giftRecipient?: string;

  @Property({ nullable: true })
  receiptSentAt?: Date;

  @Property({ nullable: true })
  ebooksSentAt?: Date;

  @ManyToOne(() => UserEntity, { deleteRule: 'restrict' })
  user!: UserEntity;

  @OneToMany(() => OrderItemEntity, (item) => item.order)
  items = new Collection<OrderItemEntity>(this);
}

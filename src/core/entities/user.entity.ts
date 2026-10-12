import {
  Collection,
  Entity,
  Enum,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserRole } from 'src/core/enums/user-role.enum';

@Entity({ tableName: 'users' })
export class UserEntity extends BaseEntity<
  'enabled' | 'banned' | 'suspendedTimes' | 'role'
> {
  @Property()
  name!: string;

  @Property()
  surname!: string;

  @Property({ unique: true })
  username!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ nullable: true })
  profilePic?: string;

  @Property({ nullable: true, hidden: true })
  passwordHash?: string;

  @Property({ default: false })
  enabled = false;

  @Property({ default: false })
  banned = false;

  @Property({ default: 0 })
  suspendedTimes = 0;

  @Property({ nullable: true })
  dateSuspended?: Date;

  @Enum({
    items: () => UserRole,
    nativeEnumName: 'user_role',
    default: UserRole.USER,
  })
  role: UserRole = UserRole.USER;

  @Property({ nullable: true, hidden: true })
  confirmationTokenHash?: string;

  @Property({ nullable: true, hidden: true })
  confirmationTokenExpiresAt?: Date;

  @Property({ nullable: true, hidden: true })
  resetCodeHash?: string;

  @Property({ nullable: true, hidden: true })
  resetCodeExpiresAt?: Date;

  @OneToMany(() => ReviewEntity, (review) => review.user)
  reviews = new Collection<ReviewEntity>(this);

  @OneToMany(() => ReviewReportEntity, (report) => report.user)
  reviewReports = new Collection<ReviewReportEntity>(this);

  @OneToMany(() => FavoriteEntity, (favorite) => favorite.user)
  favorites = new Collection<FavoriteEntity>(this);

  @OneToMany(() => CartItemEntity, (item) => item.user)
  cartItems = new Collection<CartItemEntity>(this);

  @OneToMany(() => OrderEntity, (order) => order.user)
  orders = new Collection<OrderEntity>(this);
}

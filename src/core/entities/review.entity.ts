import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Entity({ tableName: 'reviews' })
export class ReviewEntity extends BaseEntity {
  @Property({ length: 20 })
  title!: string;

  @Property({ length: 255 })
  review!: string;

  @Property()
  rating!: number;

  @ManyToOne(() => BookEntity, { deleteRule: 'cascade' })
  book!: BookEntity;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user!: UserEntity;

  @OneToMany(() => ReviewReportEntity, (report) => report.review)
  reports = new Collection<ReviewReportEntity>(this);
}

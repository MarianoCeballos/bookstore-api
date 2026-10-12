import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Entity({ tableName: 'review_reports' })
@Unique({ properties: ['review', 'user'] })
export class ReviewReportEntity extends BaseEntity {
  @ManyToOne(() => ReviewEntity, { deleteRule: 'cascade' })
  review!: ReviewEntity;

  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user!: UserEntity;
}

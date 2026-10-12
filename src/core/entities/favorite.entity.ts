import { Entity, ManyToOne, Unique } from '@mikro-orm/core';
import { BaseEntity } from 'src/core/entities/base.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Entity({ tableName: 'favorites' })
@Unique({ properties: ['user', 'book'] })
export class FavoriteEntity extends BaseEntity {
  @ManyToOne(() => UserEntity, { deleteRule: 'cascade' })
  user!: UserEntity;

  @ManyToOne(() => BookEntity, { deleteRule: 'cascade' })
  book!: BookEntity;
}

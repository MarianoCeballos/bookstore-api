import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { StatsController } from 'src/modules/stats/stats.controller';
import { StatsService } from 'src/modules/stats/stats.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      BookEntity,
      CategoryEntity,
      OrderEntity,
      UserEntity,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}

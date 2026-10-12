import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BookEntity } from 'src/core/entities/book.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { BooksModule } from 'src/modules/books/books.module';
import { ReviewsController } from 'src/modules/reviews/reviews.controller';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

@Module({
  imports: [
    BooksModule,
    MikroOrmModule.forFeature([
      BookEntity,
      ReviewEntity,
      ReviewReportEntity,
      UserEntity,
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}

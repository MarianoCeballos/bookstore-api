import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewUserSummaryDto } from 'src/modules/books/dto/book-view.dto';

export class ReviewBookSummaryDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  image?: string;
}

export class ReviewViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  review!: string;

  @ApiProperty()
  rating!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  bookID!: number;

  @ApiProperty()
  userID!: number;

  @ApiProperty({ type: ReviewBookSummaryDto })
  book!: ReviewBookSummaryDto;

  @ApiProperty({ type: ReviewUserSummaryDto })
  user!: ReviewUserSummaryDto;

  @ApiProperty({
    type: [Number],
    description: 'IDs of the users who reported this review',
  })
  reports!: number[];
}

export class UserReviewsResponseDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  surname!: string;

  @ApiPropertyOptional()
  profilePic?: string;

  @ApiProperty({ type: [ReviewViewDto] })
  reviews!: ReviewViewDto[];
}

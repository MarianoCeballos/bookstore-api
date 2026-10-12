import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewUserSummaryDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  username!: string;

  @ApiPropertyOptional()
  profilePic?: string;
}

export class BookReviewDto {
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

  @ApiProperty({ type: ReviewUserSummaryDto })
  user!: ReviewUserSummaryDto;

  @ApiProperty({
    type: [Number],
    description: 'IDs of the users who reported this review',
  })
  reports!: number[];
}

export class BookViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, example: '19.95' })
  price!: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty({ type: [String] })
  authors!: string[];

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiPropertyOptional()
  publisher?: string;

  @ApiPropertyOptional()
  publishedDate?: string;

  @ApiPropertyOptional()
  pageCount?: number;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  language?: string;

  @ApiPropertyOptional()
  avgReadingTime?: string;

  @ApiProperty()
  soldCopies!: number;

  @ApiProperty({ type: [BookReviewDto] })
  reviews!: BookReviewDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class HomeBooksResponseDto {
  @ApiProperty({ type: [BookViewDto] })
  bestSellers!: BookViewDto[];

  @ApiProperty({ type: [BookViewDto] })
  mostPopular!: BookViewDto[];

  @ApiProperty({ type: [BookViewDto] })
  newReleases!: BookViewDto[];
}

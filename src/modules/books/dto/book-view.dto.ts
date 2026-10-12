import { ApiProperty } from '@nestjs/swagger';

export class BookViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ type: String, example: '19.95' })
  price!: string;

  @ApiProperty({ required: false })
  image?: string;

  @ApiProperty({ type: [String] })
  authors!: string[];

  @ApiProperty({ type: [String] })
  categories!: string[];

  @ApiProperty({ required: false })
  publisher?: string;

  @ApiProperty({ required: false })
  publishedDate?: string;

  @ApiProperty({ required: false })
  pageCount?: number;

  @ApiProperty({ required: false })
  rating?: number;

  @ApiProperty({ required: false })
  language?: string;

  @ApiProperty({ required: false })
  avgReadingTime?: string;

  @ApiProperty()
  soldCopies!: number;

  @ApiProperty({ type: [Object] })
  reviews!: Array<Record<string, unknown>>;
}

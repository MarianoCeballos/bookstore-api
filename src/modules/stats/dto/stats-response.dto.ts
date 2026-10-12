import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StatsBookDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiProperty()
  soldCopies!: number;
}

export class StatsCategoryDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  soldCopies!: number;
}

export class StatsCreatedDateDto {
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class StatsUsersDto {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty({ type: [StatsCreatedDateDto] })
  createdDate!: StatsCreatedDateDto[];
}

export class StatsPaymentDto {
  @ApiProperty()
  items!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '19.95' })
  total!: string;
}

export class StatsResponseDto {
  @ApiProperty({ type: [StatsBookDto] })
  books!: StatsBookDto[];

  @ApiProperty({ type: [StatsCategoryDto] })
  categories!: StatsCategoryDto[];

  @ApiProperty({ type: StatsUsersDto })
  users!: StatsUsersDto;

  @ApiProperty({ type: [StatsPaymentDto] })
  payments!: StatsPaymentDto[];
}

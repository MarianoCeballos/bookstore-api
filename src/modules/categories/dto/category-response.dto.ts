import { ApiProperty } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  soldCopies!: number;
}

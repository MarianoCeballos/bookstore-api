import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaxonomyInputDto } from 'src/modules/books/dto/taxonomy-input.dto';

export class CreateBookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  description!: string;

  @ApiProperty({ example: '19.95', type: String })
  @IsNumberString()
  @Matches(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/)
  price!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string;

  @ApiProperty({ type: [TaxonomyInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxonomyInputDto)
  authors!: TaxonomyInputDto[];

  @ApiProperty({ type: [TaxonomyInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxonomyInputDto)
  categories!: TaxonomyInputDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publisher?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publishedDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  pageCount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  language?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TaxonomyInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  created?: boolean;
}

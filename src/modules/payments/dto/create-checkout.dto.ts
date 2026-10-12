import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  gift?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  giftRecipient?: string;
}

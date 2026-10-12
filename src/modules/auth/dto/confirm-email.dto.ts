import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class ConfirmEmailDto {
  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @Matches(/^[a-f0-9]{64}$/i)
  token!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ResetConfirmDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ID!: string;

  @ApiProperty({ minLength: 6, maxLength: 6 })
  @IsString()
  @Matches(/^\d{6}$/)
  resetCode!: string;
}

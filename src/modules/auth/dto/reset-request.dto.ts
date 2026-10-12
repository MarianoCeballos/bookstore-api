import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResetRequestDto {
  @ApiProperty({ example: 'reader@example.com' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  user!: string;
}

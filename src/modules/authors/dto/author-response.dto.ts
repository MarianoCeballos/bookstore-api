import { ApiProperty } from '@nestjs/swagger';

export class AuthorResponseDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  name!: string;
}

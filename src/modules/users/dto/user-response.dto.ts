import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { UserRole } from 'src/core/enums/user-role.enum';
import { BookViewDto } from 'src/modules/books/dto/book-view.dto';

export class BookIdDto {
  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ID!: number;
}

export class UserPublicViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  surname!: string;

  @ApiPropertyOptional()
  profilePic?: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role!: UserRole;

  @ApiProperty()
  admin!: boolean;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  banned!: boolean;

  @ApiProperty()
  suspendedTimes!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class UserAdminViewDto extends UserPublicViewDto {
  @ApiProperty()
  email!: string;
}

export class UpdateUserResponseDto {
  @ApiProperty()
  message!: string;

  @ApiProperty({ type: UserPublicViewDto })
  data!: UserPublicViewDto;
}

export class FavoriteTimestampDto {
  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class FavoriteBookDto extends BookViewDto {
  @ApiProperty({ type: FavoriteTimestampDto })
  user_bookfav!: FavoriteTimestampDto;
}

export class CartBookDto extends BookViewDto {
  @ApiProperty({ type: FavoriteTimestampDto })
  user_bookcart!: FavoriteTimestampDto;
}

export class FavoritesResponseDto {
  @ApiProperty({ type: [FavoriteBookDto] })
  data!: FavoriteBookDto[];

  @ApiProperty()
  message!: string;
}

export class CartResponseDto {
  @ApiProperty({ type: [CartBookDto] })
  data!: CartBookDto[];

  @ApiProperty()
  message!: string;
}

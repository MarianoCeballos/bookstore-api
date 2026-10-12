import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/core/enums/user-role.enum';

export class AuthResponseDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  surname!: string;

  @ApiProperty({ required: false })
  profilePic?: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty()
  admin!: boolean;

  @ApiProperty()
  enabled!: boolean;

  @ApiProperty()
  banned!: boolean;

  @ApiProperty()
  suspendedTimes!: number;

  @ApiProperty()
  token!: string;
}

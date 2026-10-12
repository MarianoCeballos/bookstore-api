import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  dateSuspended?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  token!: string;
}

export class ResetTokenDataDto {
  @ApiProperty()
  resetToken!: string;
}

export class ConfirmResetResponseDto {
  @ApiProperty({ type: ResetTokenDataDto })
  data!: ResetTokenDataDto;

  @ApiProperty()
  message!: string;
}

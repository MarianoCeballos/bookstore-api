import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from 'src/core/decorators/roles.decorator';
import { UserRole } from 'src/core/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { UsersService } from 'src/modules/users/users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class UserLookupsController {
  constructor(private readonly users: UsersService) {}

  @Get('usernames')
  @ApiOperation({ summary: 'List all usernames' })
  @ApiOkResponse({ type: [String] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getUsernames(): Promise<string[]> {
    return this.users.usernames();
  }

  @Get('emails')
  @ApiOperation({ summary: 'List all user emails' })
  @ApiOkResponse({ type: [String] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getEmails(): Promise<string[]> {
    return this.users.emails();
  }
}

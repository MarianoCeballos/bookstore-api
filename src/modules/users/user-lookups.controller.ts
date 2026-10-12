import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  getUsernames(): Promise<string[]> {
    return this.users.usernames();
  }

  @Get('emails')
  getEmails(): Promise<string[]> {
    return this.users.emails();
  }
}

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
import { StatsResponseDto } from 'src/modules/stats/dto/stats-response.dto';
import { StatsService } from 'src/modules/stats/stats.service';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Get the admin analytics dataset' })
  @ApiOkResponse({ type: StatsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  getStats(): Promise<StatsResponseDto> {
    return this.stats.getStats();
  }
}

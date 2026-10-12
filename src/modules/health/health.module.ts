import { Controller, Get, Module } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
class HealthController {
  @Get()
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  getStatus(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { CreateCheckoutDto } from 'src/modules/payments/dto/create-checkout.dto';
import { VerifyPaymentDto } from 'src/modules/payments/dto/verify-payment.dto';
import { PaymentsService } from 'src/modules/payments/payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an order and MercadoPago checkout preference' })
  createPreference(
    @Body() input: CreateCheckoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ preferenceId: string; orderId: number }> {
    return this.payments.createPreference(user, input);
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a provider payment and finalize its order' })
  verify(
    @Body() input: VerifyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.payments.verifyPayment(input.paymentId, user);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Process a signed MercadoPago payment notification' })
  webhook(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Query('data.id') queryId: string | undefined,
    @Body() body: { data?: { id?: string } },
  ): Promise<{ received: true }> {
    const paymentId = queryId ?? body.data?.id;
    if (!paymentId) {
      throw new BadRequestException('Payment ID is missing from notification');
    }
    return this.payments.handleWebhook(paymentId, signature, requestId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOrders(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Array<Record<string, unknown>>> {
    return this.payments.findAll(user);
  }

  @Get(':ID')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getOrder(
    @Param('ID') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.payments.findById(id, user);
  }
}

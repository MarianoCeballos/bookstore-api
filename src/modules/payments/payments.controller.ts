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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CheckoutResponseDto,
  OrderViewDto,
  WebhookBodyDto,
  WebhookResponseDto,
} from 'src/modules/payments/dto/payment-response.dto';
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
  @ApiOperation({
    summary: 'Create an order and MercadoPago checkout preference',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  @ApiBadRequestResponse({ description: 'Cart is empty or request is invalid' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Account is unavailable for checkout' })
  @ApiServiceUnavailableResponse({
    description: 'Payment provider unavailable',
  })
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
  @ApiCreatedResponse({ type: OrderViewDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this resource' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  verify(
    @Body() input: VerifyPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderViewDto> {
    return this.payments.verifyPayment(input.paymentId, user);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Process a signed MercadoPago payment notification',
  })
  @ApiBody({ type: WebhookBodyDto })
  @ApiCreatedResponse({ type: WebhookResponseDto })
  @ApiBadRequestResponse({
    description: 'Payment ID is missing from notification',
  })
  @ApiUnauthorizedResponse({ description: 'Notification signature is invalid' })
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
  @ApiOperation({
    summary: 'List the current user orders (all orders for admins)',
  })
  @ApiOkResponse({ type: [OrderViewDto] })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  getOrders(@CurrentUser() user: AuthenticatedUser): Promise<OrderViewDto[]> {
    return this.payments.findAll(user);
  }

  @Get(':ID')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an order by order ID or provider payment ID' })
  @ApiOkResponse({ type: OrderViewDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this resource' })
  @ApiNotFoundResponse({ description: 'Order not found' })
  getOrder(
    @Param('ID') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderViewDto> {
    return this.payments.findById(id, user);
  }
}

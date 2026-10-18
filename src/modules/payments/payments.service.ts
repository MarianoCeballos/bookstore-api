import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { EntityManager } from '@mikro-orm/postgresql';
import { LockMode } from '@mikro-orm/core';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { OrderStatus } from 'src/core/enums/order-status.enum';
import { UserRole } from 'src/core/enums/user-role.enum';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { EmailService } from 'src/modules/email/email.service';
import { CreateCheckoutDto } from 'src/modules/payments/dto/create-checkout.dto';
import { isValidMercadoPagoSignature } from 'src/modules/payments/payment-signature';
import { OrderViewDto } from 'src/modules/payments/dto/payment-response.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly em: EntityManager,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    @InjectRepository(OrderEntity)
    private readonly orders: EntityRepository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItems: EntityRepository<OrderItemEntity>,
    @InjectRepository(CartItemEntity)
    private readonly cart: EntityRepository<CartItemEntity>,
    @InjectRepository(UserEntity)
    private readonly users: EntityRepository<UserEntity>,
  ) {}

  async createPreference(
    currentUser: AuthenticatedUser,
    options: CreateCheckoutDto,
  ): Promise<{ preferenceId: string; orderId: number }> {
    const user = await this.users.findOne({ ID: currentUser.ID });
    if (!user || !user.enabled || user.banned) {
      throw new ForbiddenException('Account is unavailable for checkout');
    }
    const cartItems = await this.cart.find(
      { user: { ID: user.ID } },
      { populate: ['book'] },
    );
    if (cartItems.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }
    const snapshots = cartItems.map(({ book }) => ({
      book,
      title: book.title,
      unitPrice: this.money(book.price),
    }));
    const totalCents = snapshots.reduce(
      (sum, item) => sum + this.toCents(item.unitPrice),
      0n,
    );
    const order = this.orders.create({
      user,
      status: OrderStatus.PENDING,
      total: this.fromCents(totalCents),
      gift: options.gift ?? false,
      giftRecipient: options.giftRecipient,
    });
    await this.orders.getEntityManager().persist(order).flush();
    const lines = snapshots.map(({ book, title, unitPrice }) =>
      this.orderItems.create({
        order,
        book,
        title,
        unitPrice,
        quantity: 1,
      }),
    );
    await this.orderItems.getEntityManager().persist(lines).flush();
    try {
      const result = await new Preference(this.mercadoPagoClient()).create({
        body: {
          items: snapshots.map(({ book, title, unitPrice }) => ({
            id: String(book.ID),
            title,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: Number(unitPrice),
            picture_url: book.image ?? undefined,
          })),
          payer: { email: user.email },
          external_reference: String(order.ID),
          back_urls: {
            success: `${this.config.getOrThrow<string>('FRONTEND_URL')}/checkout/validate?status=success`,
            failure: `${this.config.getOrThrow<string>('FRONTEND_URL')}/checkout/validate?status=failure`,
            pending: `${this.config.getOrThrow<string>('FRONTEND_URL')}/checkout/validate?status=pending`,
          },
          auto_return: 'approved',
          notification_url: `${this.config.getOrThrow<string>('API_PUBLIC_URL')}/payments/webhook`,
          metadata: { orderId: order.ID },
        },
      });
      if (!result.id) {
        throw new ServiceUnavailableException(
          'Payment preference was not created',
        );
      }
      order.providerPreferenceId = result.id;
      await this.orders.getEntityManager().flush();
      return { preferenceId: result.id, orderId: order.ID };
    } catch (error) {
      await this.orders.getEntityManager().remove(order).flush();
      throw error;
    }
  }

  async verifyPayment(
    paymentId: string,
    currentUser?: AuthenticatedUser,
  ): Promise<OrderViewDto> {
    const response = await new Payment(this.mercadoPagoClient()).get({
      id: paymentId,
    });
    if (!response.external_reference) {
      throw new BadRequestException('Payment is missing its order reference');
    }
    const orderId = Number(response.external_reference);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
      throw new BadRequestException('Payment has an invalid order reference');
    }
    const order = await this.orders.findOne(
      { ID: orderId },
      { populate: ['items', 'items.book', 'items.book.categories', 'user'] },
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (
      currentUser &&
      order.user.ID !== currentUser.ID &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You may only access your own orders');
    }
    if (
      response.status === 'approved' &&
      this.toCents(String(response.transaction_amount)) !==
        this.toCents(order.total)
    ) {
      throw new UnauthorizedException('Payment total does not match the order');
    }
    if (response.status === 'approved') {
      await this.finalizeApprovedOrder(
        order.ID,
        String(response.id ?? paymentId),
      );
    }
    if (response.status === 'rejected') {
      order.status = OrderStatus.REJECTED;
      order.providerPaymentId = String(response.id ?? paymentId);
      await this.orders.getEntityManager().flush();
    }
    const updatedOrder = await this.orders.findOne(
      { ID: order.ID },
      { populate: ['items', 'items.book', 'user'] },
    );
    if (!updatedOrder) {
      throw new NotFoundException('Order not found');
    }
    return this.toView(updatedOrder);
  }

  async handleWebhook(
    paymentId: string,
    signature: string | undefined,
    requestId: string | undefined,
  ): Promise<{ received: true }> {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (
      !secret ||
      !signature ||
      !requestId ||
      !isValidMercadoPagoSignature(secret, signature, requestId, paymentId)
    ) {
      throw new UnauthorizedException(
        'Payment notification signature is invalid',
      );
    }
    await this.verifyPayment(paymentId);
    return { received: true };
  }

  async findAll(currentUser: AuthenticatedUser): Promise<OrderViewDto[]> {
    const where =
      currentUser.role === UserRole.ADMIN
        ? {}
        : { user: { ID: currentUser.ID } };
    const orders = await this.orders.find(where, {
      populate: ['items', 'items.book', 'user'],
      orderBy: { createdAt: 'DESC' },
    });
    return orders.map((order) => this.toView(order));
  }

  async findById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<OrderViewDto> {
    const numericId = /^\d+$/.test(id) ? Number(id) : undefined;
    const order = await this.orders.findOne(
      numericId === undefined
        ? { providerPaymentId: id }
        : { $or: [{ providerPaymentId: id }, { ID: numericId }] },
      { populate: ['items', 'items.book', 'user'] },
    );
    if (!order) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    if (
      order.user.ID !== currentUser.ID &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You may only access your own orders');
    }
    return this.toView(order);
  }

  private async finalizeApprovedOrder(
    orderId: number,
    paymentId: string,
  ): Promise<void> {
    await this.em.transactional(async (em) => {
      const order = await em.findOne(
        OrderEntity,
        { ID: orderId },
        {
          populate: ['items', 'items.book', 'items.book.categories', 'user'],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.status !== OrderStatus.APPROVED) {
        order.status = OrderStatus.APPROVED;
        order.providerPaymentId = paymentId;
        for (const item of order.items) {
          item.book.soldCopies += item.quantity;
          for (const category of item.book.categories) {
            category.soldCopies += item.quantity;
          }
        }
        await em.nativeDelete(CartItemEntity, { user: order.user });
      }
      await em.flush();
    });
    const order = await this.orders.findOne(
      { ID: orderId },
      { populate: ['items', 'items.book', 'user'] },
    );
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (!order.receiptSentAt) {
      await this.email.sendOrderReceipt(
        order.user.email,
        order.ID,
        order.items.getItems().map((item) => ({
          title: item.title,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
        order.total,
      );
      order.receiptSentAt = new Date();
      await this.orders.getEntityManager().flush();
    }
    if (!order.ebooksSentAt) {
      await this.email.sendEbooks(
        order.user.email,
        order.items.getItems().map((item) => ({
          title: item.title,
          description: item.book.description,
        })),
      );
      order.ebooksSentAt = new Date();
      await this.orders.getEntityManager().flush();
    }
  }

  private toView(order: OrderEntity): OrderViewDto {
    return {
      ID: order.ID,
      mpID: order.providerPaymentId ?? String(order.ID),
      preferenceId: order.providerPreferenceId,
      items: order.items.getItems().map((item) => ({
        ID: item.book.ID,
        title: item.title,
        quantity: item.quantity,
        price: item.unitPrice,
        unit_price: item.unitPrice,
        picture_url: item.book.image ?? undefined,
      })),
      total: order.total,
      gift: order.gift,
      giftrecipient: order.giftRecipient,
      status: order.status,
      user: {
        ID: order.user.ID,
        username: order.user.username,
        email: order.user.email,
      },
      createdAt: order.createdAt,
    };
  }

  private mercadoPagoClient(): MercadoPagoConfig {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new ServiceUnavailableException('MercadoPago is not configured');
    }
    return new MercadoPagoConfig({ accessToken });
  }

  private money(value: string): string {
    const cents = this.toCents(value);
    if (cents < 0n) {
      throw new BadRequestException('Price cannot be negative');
    }
    return this.fromCents(cents);
  }

  private toCents(value: string): bigint {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException('Invalid decimal amount');
    }
    const [whole = '0', decimal = ''] = value.split('.');
    return BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0'));
  }

  private fromCents(value: bigint): string {
    return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
  }
}

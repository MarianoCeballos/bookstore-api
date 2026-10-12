import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from 'src/core/enums/order-status.enum';

export class CheckoutResponseDto {
  @ApiProperty()
  preferenceId!: string;

  @ApiProperty()
  orderId!: number;
}

export class WebhookResponseDto {
  @ApiProperty({ type: Boolean, enum: [true] })
  received!: true;
}

export class WebhookDataDto {
  @ApiPropertyOptional()
  id?: string;
}

export class WebhookBodyDto {
  @ApiPropertyOptional({ type: WebhookDataDto })
  data?: WebhookDataDto;
}

export class OrderItemViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty({ example: '19.95' })
  price!: string;

  @ApiProperty({ example: '19.95' })
  unit_price!: string;

  @ApiPropertyOptional()
  picture_url?: string;
}

export class OrderUserViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  email!: string;
}

export class OrderViewDto {
  @ApiProperty()
  ID!: number;

  @ApiProperty()
  mpID!: string;

  @ApiPropertyOptional()
  preferenceId?: string;

  @ApiProperty({ type: [OrderItemViewDto] })
  items!: OrderItemViewDto[];

  @ApiProperty({ example: '19.95' })
  total!: string;

  @ApiProperty()
  gift!: boolean;

  @ApiPropertyOptional()
  giftrecipient?: string;

  @ApiProperty({ enum: OrderStatus, enumName: 'OrderStatus' })
  status!: OrderStatus;

  @ApiProperty({ type: OrderUserViewDto })
  user!: OrderUserViewDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

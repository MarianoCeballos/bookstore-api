import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'MercadoPago payment ID returned by checkout' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  paymentId!: string;
}

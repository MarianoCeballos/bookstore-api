import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { EmailModule } from 'src/modules/email/email.module';
import { PaymentsController } from 'src/modules/payments/payments.controller';
import { PaymentsService } from 'src/modules/payments/payments.service';

@Module({
  imports: [
    EmailModule,
    MikroOrmModule.forFeature([
      CartItemEntity,
      OrderEntity,
      OrderItemEntity,
      UserEntity,
    ]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { EmailController } from 'src/modules/email/email.controller';
import { EmailService } from 'src/modules/email/email.service';

@Module({
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

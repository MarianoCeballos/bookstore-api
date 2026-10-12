import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MessageResponseDto } from 'src/core/dto/message-response.dto';
import { ContactEmailDto } from 'src/modules/email/dto/contact-email.dto';
import { EmailService } from 'src/modules/email/email.service';

@ApiTags('emails')
@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  @ApiOperation({ summary: 'Send a contact message' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  async sendContact(
    @Body() input: ContactEmailDto,
  ): Promise<{ message: string }> {
    await this.emailService.sendContact(
      input.sender,
      input.title,
      input.message,
    );
    return { message: 'Thanks for contacting us!' };
  }
}

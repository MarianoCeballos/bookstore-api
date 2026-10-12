import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EmailService } from 'src/modules/email/email.service';

class ContactEmailDto {
  @IsEmail()
  sender!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}

@ApiTags('emails')
@Controller('emails')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  @ApiOperation({ summary: 'Send a contact message' })
  async sendContact(
    @Body() input: ContactEmailDto,
  ): Promise<{ message: string }> {
    await this.emailService.sendContact(input.sender, input.title, input.message);
    return { message: 'Thanks for contacting us!' };
  }
}

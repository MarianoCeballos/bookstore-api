import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { AuthService } from 'src/modules/auth/auth.service';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { ConfirmEmailDto } from 'src/modules/auth/dto/confirm-email.dto';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { ResendConfirmationDto } from 'src/modules/auth/dto/resend-confirmation.dto';
import { ResetConfirmDto } from 'src/modules/auth/dto/reset-confirm.dto';
import { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import { ResetRequestDto } from 'src/modules/auth/dto/reset-request.dto';
import { LocalAuthGuard } from 'src/modules/auth/local-auth.guard';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('users')
  @ApiOperation({ summary: 'Register and send an email confirmation' })
  register(@Body() input: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(input);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Sign in using a username or email and password' })
  login(
    @Body() _input: LoginDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.authService.currentUser(user).then((account) =>
      this.authService.login(account),
    );
  }

  @Post('login/autoLogin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh the current authenticated profile' })
  autoLogin(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    return this.authService.currentUser(user).then((account) =>
      this.authService.login(account),
    );
  }

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm a registered email address' })
  confirmEmail(@Query() input: ConfirmEmailDto): Promise<{ message: string }> {
    return this.authService.confirmEmail(input.token);
  }

  @Post('emails/register')
  @ApiOperation({ summary: 'Resend an email confirmation' })
  resendConfirmation(
    @Body() input: ResendConfirmationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendConfirmation(input.username);
  }

  @Post('emails/reset')
  @ApiOperation({ summary: 'Request a password reset code' })
  requestPasswordReset(
    @Body() input: ResetRequestDto,
  ): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(input.user);
  }

  @Post('confirm/reset')
  @ApiOperation({ summary: 'Verify a password reset code' })
  confirmPasswordReset(
    @Body() input: ResetConfirmDto,
  ): Promise<{ data: { resetToken: string }; message: string }> {
    return this.authService.confirmPasswordReset(input.ID, input.resetCode);
  }

  @Post('confirm/newPassword')
  @ApiOperation({ summary: 'Change a password using a verified reset token' })
  resetPassword(
    @Body() input: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(input);
  }
}

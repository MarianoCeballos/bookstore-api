import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MessageResponseDto } from 'src/core/dto/message-response.dto';
import {
  AuthResponseDto,
  ConfirmResetResponseDto,
} from 'src/modules/auth/dto/auth-response.dto';
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
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({
    description: 'Email or username is already registered',
  })
  register(@Body() input: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(input);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Sign in using a username or email and password' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid username or password' })
  @ApiForbiddenResponse({ description: 'Account is not available for sign in' })
  async login(
    @Body() _input: LoginDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthResponseDto> {
    return this.authService
      .currentUser(user)
      .then((account) => this.authService.login(account));
  }

  @Post('login/autoLogin')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh the current authenticated profile' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async autoLogin(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuthResponseDto> {
    return this.authService
      .currentUser(user)
      .then((account) => this.authService.login(account));
  }

  @Get('confirm')
  @ApiOperation({ summary: 'Confirm a registered email address' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Confirmation link is invalid or expired',
  })
  confirmEmail(@Query() input: ConfirmEmailDto): Promise<{ message: string }> {
    return this.authService.confirmEmail(input.token);
  }

  @Post('emails/register')
  @ApiOperation({ summary: 'Resend an email confirmation' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  resendConfirmation(
    @Body() input: ResendConfirmationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendConfirmation(input.username);
  }

  @Post('emails/reset')
  @ApiOperation({ summary: 'Request a password reset code' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  requestPasswordReset(
    @Body() input: ResetRequestDto,
  ): Promise<{ message: string }> {
    return this.authService.requestPasswordReset(input.user);
  }

  @Post('confirm/reset')
  @ApiOperation({ summary: 'Verify a password reset code' })
  @ApiCreatedResponse({ type: ConfirmResetResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Reset code is invalid or expired' })
  confirmPasswordReset(
    @Body() input: ResetConfirmDto,
  ): Promise<{ data: { resetToken: string }; message: string }> {
    return this.authService.confirmPasswordReset(input.ID, input.resetCode);
  }

  @Post('confirm/newPassword')
  @ApiOperation({ summary: 'Change a password using a verified reset token' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({
    description: 'Passwords do not match or token is invalid',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  resetPassword(@Body() input: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(input);
  }
}

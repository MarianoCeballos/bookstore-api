import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from '@node-rs/argon2';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserRole } from 'src/core/enums/user-role.enum';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { EmailService } from 'src/modules/email/email.service';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { ResetPasswordDto } from 'src/modules/auth/dto/reset-password.dto';
import { AuthResponseDto } from 'src/modules/auth/dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: EntityRepository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async register(input: RegisterDto): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const existing = await this.users.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      throw new ConflictException('Email or username is already registered');
    }
    const user = this.users.create({
      email,
      username,
      name: input.name.trim(),
      surname: input.surname.trim(),
      profilePic: input.profilePic,
      passwordHash: await argon2.hash(input.password),
      role: this.adminEmails().includes(email)
        ? UserRole.ADMIN
        : UserRole.USER,
    });
    const token = randomBytes(32).toString('hex');
    user.confirmationTokenHash = this.hash(token);
    user.confirmationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await this.users.getEntityManager().persist(user).flush();
    const url = new URL(
      '/confirm',
      this.config.getOrThrow<string>('FRONTEND_URL'),
    );
    url.searchParams.set('token', token);
    await this.emailService.sendConfirmation(
      user.email,
      user.name,
      url.toString(),
    );
    return { message: 'Account created. Check your email to confirm it.' };
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserEntity> {
    const identifier = username.trim().toLowerCase();
    const user = await this.users.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
    if (
      !user ||
      !user.passwordHash ||
      !(await argon2.verify(user.passwordHash, password))
    ) {
      throw new UnauthorizedException('Invalid username or password');
    }
    if (!user.enabled || user.banned) {
      throw new ForbiddenException('Account is not available for sign in');
    }
    return user;
  }

  async login(user: UserEntity): Promise<AuthResponseDto> {
    const token = await this.jwt.signAsync(
      { sub: user.ID, email: user.email, role: user.role },
      { expiresIn: this.config.get<number>('JWT_EXPIRES_IN_SECONDS', 86400) },
    );
    return { ...this.toPublicUser(user), token };
  }

  async confirmEmail(token: string): Promise<{ message: string }> {
    const user = await this.users.findOne({
      confirmationTokenHash: this.hash(token),
    });
    if (
      !user ||
      !user.confirmationTokenExpiresAt ||
      user.confirmationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException(
        'Confirmation link is invalid or expired',
      );
    }
    user.confirmationTokenHash = undefined;
    user.confirmationTokenExpiresAt = undefined;
    user.enabled = true;
    await this.users.getEntityManager().flush();
    return { message: 'Successful confirmation' };
  }

  async resendConfirmation(username: string): Promise<{ message: string }> {
    const user = await this.users.findOne({
      username: username.trim().toLowerCase(),
    });
    if (!user || user.enabled || user.banned) {
      return {
        message: 'If the account requires confirmation, an email was sent.',
      };
    }
    const token = randomBytes(32).toString('hex');
    user.confirmationTokenHash = this.hash(token);
    user.confirmationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );
    await this.users.getEntityManager().flush();
    const url = new URL(
      '/confirm',
      this.config.getOrThrow<string>('FRONTEND_URL'),
    );
    url.searchParams.set('token', token);
    await this.emailService.sendConfirmation(
      user.email,
      user.name,
      url.toString(),
    );
    return {
      message: 'If the account requires confirmation, an email was sent.',
    };
  }

  async requestPasswordReset(
    userIdentifier: string,
  ): Promise<{ message: string }> {
    const identifier = userIdentifier.trim().toLowerCase();
    const user = await this.users.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (user && user.enabled && !user.banned) {
      const code = String(randomInt(100000, 1000000));
      user.resetCodeHash = this.hash(code);
      user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.users.getEntityManager().flush();
      await this.emailService.sendPasswordReset(user.email, user.name, code);
    }
    return { message: 'If the account exists, a reset code was sent.' };
  }

  async confirmPasswordReset(
    id: string,
    code: string,
  ): Promise<{ data: { resetToken: string }; message: string }> {
    const user = await this.users.findOne({ ID: Number(id) });
    if (
      !user ||
      !user.resetCodeHash ||
      !user.resetCodeExpiresAt ||
      user.resetCodeExpiresAt.getTime() < Date.now() ||
      user.resetCodeHash !== this.hash(code)
    ) {
      throw new UnauthorizedException('Reset code is invalid or expired');
    }
    const resetToken = await this.jwt.signAsync(
      { sub: user.ID, purpose: 'password-reset' },
      { expiresIn: 10 * 60 },
    );
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    await this.users.getEntityManager().flush();
    return { data: { resetToken }, message: 'Successful confirmation' };
  }

  async resetPassword(input: ResetPasswordDto): Promise<{ message: string }> {
    if (input.password !== input.confirmPassword) {
      throw new UnauthorizedException('Passwords do not match');
    }
    let claims: { sub: number; purpose: string };
    try {
      claims = await this.jwt.verifyAsync(input.resetToken);
    } catch {
      throw new UnauthorizedException(
        'Password reset token is invalid or expired',
      );
    }
    if (claims.purpose !== 'password-reset' || !claims.sub) {
      throw new UnauthorizedException(
        'Password reset token is invalid or expired',
      );
    }
    const user = await this.users.findOne({ ID: claims.sub });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.passwordHash = await argon2.hash(input.password);
    await this.users.getEntityManager().flush();
    return { message: 'Successful password change' };
  }

  async currentUser(user: AuthenticatedUser): Promise<UserEntity> {
    const account = await this.users.findOne({ ID: user.ID });
    if (!account || !account.enabled || account.banned) {
      throw new UnauthorizedException('Account is not available for sign in');
    }
    return account;
  }

  toPublicUser(user: UserEntity): Omit<AuthResponseDto, 'token'> {
    return {
      ID: user.ID,
      username: user.username,
      email: user.email,
      name: user.name,
      surname: user.surname,
      profilePic: user.profilePic,
      role: user.role,
      admin: user.role === 'admin',
      enabled: user.enabled,
      banned: user.banned,
      suspendedTimes: user.suspendedTimes,
      dateSuspended: user.dateSuspended,
      createdAt: user.createdAt,
    };
  }

  private adminEmails(): string[] {
    return (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}

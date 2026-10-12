import { EntityRepository } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from '@node-rs/argon2';
import { createHash } from 'node:crypto';
import { UserEntity } from 'src/core/entities/user.entity';
import { EmailService } from 'src/modules/email/email.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';

describe('AuthService', () => {
  it('stores a one-day confirmation hash and sends a confirmation link', async () => {
    const entityManager = { persistAndFlush: jest.fn().mockResolvedValue(undefined) };
    const createUser = jest.fn((data: Partial<UserEntity>) =>
      Object.assign(new UserEntity(), data),
    );
    const sendConfirmation = jest.fn().mockResolvedValue(undefined);
    const users = {
      findOne: jest.fn().mockResolvedValue(null),
      create: createUser,
      getEntityManager: jest.fn().mockReturnValue(entityManager),
    } as unknown as EntityRepository<UserEntity>;
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:5173'),
    } as unknown as ConfigService;
    const email = {
      sendConfirmation,
    } as unknown as EmailService;
    const service = new AuthService(
      users,
      {} as unknown as JwtService,
      config,
      email,
    );
    const input: RegisterDto = {
      username: 'Reader',
      email: 'Reader@example.com',
      name: 'Alex',
      surname: 'Reader',
      password: 'correct horse battery',
    };

    await service.register(input);

    const user = createUser.mock.results[0]?.value;
    const confirmationUrl = sendConfirmation.mock.calls[0]?.[2];
    if (!user || typeof confirmationUrl !== 'string') {
      throw new Error('Registration did not create a user confirmation');
    }
    const sentUrl = new URL(confirmationUrl);
    expect(user.username).toBe('reader');
    expect(user.email).toBe('reader@example.com');
    expect(await argon2.verify(user.passwordHash ?? '', input.password)).toBe(true);
    expect(user.confirmationTokenHash).toBe(
      createHash('sha256').update(sentUrl.searchParams.get('token') ?? '').digest('hex'),
    );
    expect(user.confirmationTokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect(entityManager.persistAndFlush).toHaveBeenCalledWith(user);
  });

  it('rejects expired email confirmation tokens', async () => {
    const user = Object.assign(new UserEntity(), {
      confirmationTokenHash: createHash('sha256').update('expired-token').digest('hex'),
      confirmationTokenExpiresAt: new Date(Date.now() - 1),
    });
    const users = {
      findOne: jest.fn().mockResolvedValue(user),
    } as unknown as EntityRepository<UserEntity>;
    const service = new AuthService(
      users,
      {} as unknown as JwtService,
      {} as unknown as ConfigService,
      {} as unknown as EmailService,
    );

    await expect(service.confirmEmail('expired-token')).rejects.toThrow(
      'Confirmation link is invalid or expired',
    );
  });
});

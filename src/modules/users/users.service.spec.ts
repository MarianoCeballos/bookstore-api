import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BookEntity } from 'src/core/entities/book.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserRole } from 'src/core/enums/user-role.enum';
import { BooksService } from 'src/modules/books/books.service';
import {
  MAX_PROFILE_PIC_BYTES,
  type UploadedImageFile,
} from 'src/modules/users/profile-picture.util';
import { UsersService } from 'src/modules/users/users.service';

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const VALID_WEBP_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe('UsersService profile picture handling', () => {
  const flushMock = jest.fn().mockResolvedValue(undefined);
  let storedUser: UserEntity;
  let service: UsersService;

  beforeEach(() => {
    flushMock.mockClear();
    storedUser = {
      ID: 1,
      username: 'reader',
      email: 'reader@example.com',
      name: 'Alex',
      surname: 'Reader',
      profilePic: undefined,
      role: UserRole.USER,
      enabled: true,
      banned: false,
      suspendedTimes: 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } as UserEntity;

    const usersRepository = {
      findOne: jest.fn(async (where: { ID?: number }) =>
        where.ID === 1 ? storedUser : null,
      ),
      getEntityManager: () => ({
        flush: flushMock,
      }),
    } as unknown as EntityRepository<UserEntity>;

    service = new UsersService(
      usersRepository,
      {} as EntityRepository<BookEntity>,
      {} as EntityRepository<FavoriteEntity>,
      {} as EntityRepository<CartItemEntity>,
      {} as BooksService,
    );
  });

  const makeFile = (
    overrides: Partial<UploadedImageFile> = {},
  ): UploadedImageFile => ({
    fieldname: 'file',
    originalname: 'avatar.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: VALID_PNG_BUFFER.byteLength,
    buffer: VALID_PNG_BUFFER,
    ...overrides,
  });

  it('uploads a valid PNG profile picture and persists base64 data URL', async () => {
    const result = await service.uploadProfilePicture(
      1,
      { ID: 1, email: 'reader@example.com', role: UserRole.USER },
      makeFile(),
    );

    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(result.data.profilePic).toBe(
      `data:image/png;base64,${VALID_PNG_BUFFER.toString('base64')}`,
    );
  });

  it('uploads valid JPEG and WebP profile pictures', async () => {
    const jpegResult = await service.uploadProfilePicture(
      1,
      { ID: 1, email: 'reader@example.com', role: UserRole.USER },
      makeFile({
        originalname: 'photo.jpg',
        mimetype: 'image/jpeg',
        size: VALID_JPEG_BUFFER.byteLength,
        buffer: VALID_JPEG_BUFFER,
      }),
    );
    expect(jpegResult.data.profilePic).toBe(
      `data:image/jpeg;base64,${VALID_JPEG_BUFFER.toString('base64')}`,
    );

    const webpResult = await service.uploadProfilePicture(
      1,
      { ID: 1, email: 'reader@example.com', role: UserRole.USER },
      makeFile({
        originalname: 'photo.webp',
        mimetype: 'image/webp',
        size: VALID_WEBP_BUFFER.byteLength,
        buffer: VALID_WEBP_BUFFER,
      }),
    );
    expect(webpResult.data.profilePic).toBe(
      `data:image/webp;base64,${VALID_WEBP_BUFFER.toString('base64')}`,
    );
  });

  it('rejects files larger than 2 MB', async () => {
    const oversizedBuffer = Buffer.alloc(MAX_PROFILE_PIC_BYTES + 1);
    VALID_PNG_BUFFER.copy(oversizedBuffer, 0);

    await expect(
      service.uploadProfilePicture(
        1,
        { ID: 1, email: 'reader@example.com', role: UserRole.USER },
        makeFile({
          size: oversizedBuffer.byteLength,
          buffer: oversizedBuffer,
        }),
      ),
    ).rejects.toThrow(
      new BadRequestException('Profile picture must be 2 MB or smaller'),
    );
    expect(flushMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported formats or spoofed magic bytes', async () => {
    await expect(
      service.uploadProfilePicture(
        1,
        { ID: 1, email: 'reader@example.com', role: UserRole.USER },
        makeFile({
          originalname: 'malicious.svg',
          mimetype: 'image/svg+xml',
          buffer: Buffer.from('<svg></svg>'),
          size: 11,
        }),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      ),
    );

    await expect(
      service.uploadProfilePicture(
        1,
        { ID: 1, email: 'reader@example.com', role: UserRole.USER },
        makeFile({
          originalname: 'fake.png',
          mimetype: 'image/png',
          buffer: Buffer.from('not-an-image'),
          size: 12,
        }),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      ),
    );
  });

  it('removes a user profile picture', async () => {
    storedUser.profilePic = `data:image/png;base64,${VALID_PNG_BUFFER.toString('base64')}`;

    const result = await service.removeProfilePicture(1, {
      ID: 1,
      email: 'reader@example.com',
      role: UserRole.USER,
    });

    expect(flushMock).toHaveBeenCalledTimes(1);
    expect(result.data.profilePic).toBeUndefined();
  });

  it('prevents a non-admin from uploading to another user account', async () => {
    await expect(
      service.uploadProfilePicture(
        1,
        { ID: 2, email: 'other@example.com', role: UserRole.USER },
        makeFile(),
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});

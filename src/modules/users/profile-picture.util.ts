import { BadRequestException } from '@nestjs/common';

export const MAX_PROFILE_PIC_BYTES = 2 * 1024 * 1024; // 2 MB

export const ALLOWED_PROFILE_PIC_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedProfilePicMimeType =
  (typeof ALLOWED_PROFILE_PIC_MIME_TYPES)[number];

export interface UploadedImageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function detectImageMimeType(
  buffer: Buffer,
): AllowedProfilePicMimeType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return 'image/png';
  }

  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') {
      return 'image/gif';
    }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

export function validateAndEncodeProfilePicture(
  file?: UploadedImageFile,
): string {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.byteLength === 0) {
    throw new BadRequestException('Profile picture file is required');
  }

  if (
    file.size > MAX_PROFILE_PIC_BYTES ||
    file.buffer.byteLength > MAX_PROFILE_PIC_BYTES
  ) {
    throw new BadRequestException('Profile picture must be 2 MB or smaller');
  }

  const normalizedMime = file.mimetype?.trim().toLowerCase();
  const detectedMime = detectImageMimeType(file.buffer);

  if (
    !detectedMime ||
    (Boolean(normalizedMime) &&
      normalizedMime !== 'application/octet-stream' &&
      !(ALLOWED_PROFILE_PIC_MIME_TYPES as readonly string[]).includes(
        normalizedMime,
      )) ||
    (Boolean(normalizedMime) &&
      normalizedMime !== 'application/octet-stream' &&
      normalizedMime !== detectedMime)
  ) {
    throw new BadRequestException(
      'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
    );
  }

  return `data:${detectedMime};base64,${file.buffer.toString('base64')}`;
}

const DATA_URL_PATTERN =
  /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i;

export function validateProfilePicValue(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  if (trimmed.startsWith('data:')) {
    const match = DATA_URL_PATTERN.exec(trimmed);
    if (!match) {
      throw new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      );
    }

    const declaredMimeRaw = match[1].toLowerCase();
    const declaredMime =
      declaredMimeRaw === 'image/jpg' ? 'image/jpeg' : declaredMimeRaw;
    const base64Payload = match[2].replace(/\s+/g, '');
    if (!base64Payload || base64Payload.length % 4 !== 0) {
      throw new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      );
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    if (buffer.byteLength === 0) {
      throw new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      );
    }

    if (buffer.byteLength > MAX_PROFILE_PIC_BYTES) {
      throw new BadRequestException('Profile picture must be 2 MB or smaller');
    }

    const detectedMime = detectImageMimeType(buffer);
    if (!detectedMime || detectedMime !== declaredMime) {
      throw new BadRequestException(
        'Profile picture must be a valid JPEG, PNG, WebP, or GIF image',
      );
    }

    return `data:${detectedMime};base64,${buffer.toString('base64')}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.length > 2048) {
      throw new BadRequestException(
        'Profile picture URL must be 2048 characters or fewer',
      );
    }
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      throw new BadRequestException(
        'Profile picture must be a valid image upload or HTTP(S) URL',
      );
    }
  }

  throw new BadRequestException(
    'Profile picture must be a valid image upload or HTTP(S) URL',
  );
}

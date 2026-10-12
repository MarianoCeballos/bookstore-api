import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const logger = new Logger();
const SENSITIVE_KEYS = /pass(word)?|token|secret|authorization|cookie|card/i;
const MAX_BODY_LENGTH = 2000;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== 'object' || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_KEYS.test(key) ? '[REDACTED]' : redact(val, depth + 1),
    ]),
  );
}

function stringify(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(redact(value));
  } catch {
    return '[unserializable]';
  }
  return text.length > MAX_BODY_LENGTH ? `${text.slice(0, MAX_BODY_LENGTH)}...[truncated]` : text;
}

function parseResponseBody(chunk: unknown, contentType: string): unknown {
  if (chunk === undefined || chunk === null) return undefined;
  if (!contentType.includes('json')) return `[${contentType || 'no content-type'}]`;
  const raw = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function httpLoggerMiddleware(request: Request, response: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const { method, originalUrl } = request;
  const requestId = (request.headers['x-request-id'] as string | undefined) ?? randomUUID();
  response.setHeader('x-request-id', requestId);
  const tag = `[${requestId}]`;
  logger.log(
    `${tag} ${method} - ${originalUrl} query=${stringify(request.query)} body=${stringify(request.body)}`,
    'HTTP - Request',
  );

  let responseBody: unknown;
  const originalSend = response.send.bind(response);
  response.send = ((body?: unknown) => {
    responseBody = body;
    return originalSend(body as never);
  }) as Response['send'];

  response.on('finish', () => {
    const status = response.statusCode;
    const contentType = String(response.getHeader('content-type') ?? '');
    const message = `${tag} ${method} - ${status} ${Date.now() - startedAt}ms body=${stringify(
      parseResponseBody(responseBody, contentType),
    )}`;
    if (status >= 500) logger.error(message, undefined, 'HTTP - Response');
    else if (status >= 400) logger.warn(message, 'HTTP - Response');
    else logger.log(message, 'HTTP - Response');
  });

  next();
}

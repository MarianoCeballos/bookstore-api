import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { createOpenApiDocument } from 'src/openapi-document';

async function generate(): Promise<void> {
  process.env.OPENAPI_ONLY = 'true';
  process.env.DATABASE_URL ??=
    'postgresql://bookstore:bookstore@localhost:5433/bookstore';
  process.env.JWT_SECRET ??= 'local-openapi-generation-secret-not-for-auth';
  process.env.FRONTEND_URL ??= 'http://localhost:5173';

  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  const document = createOpenApiDocument(app);
  await writeFile(
    resolve(process.cwd(), 'openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );
  await app.close();
}

void generate().catch((error: unknown) => {
  const detail =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${detail}\n`);
  process.exitCode = 1;
});

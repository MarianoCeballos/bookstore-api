import 'dotenv/config';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from 'src/app.module';
import { HttpExceptionFilter } from 'src/core/filters/http-exception.filter';
import { httpLoggerMiddleware } from 'src/core/middleware/http-logger.middleware';
import { createOpenApiDocument } from 'src/openapi-document';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const expressApp = app as NestExpressApplication;
  const config = app.get(ConfigService);
  expressApp.useBodyParser('json', { limit: '4mb' });
  expressApp.useBodyParser('urlencoded', { limit: '4mb', extended: true });
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(helmet());
  app.use(httpLoggerMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const document = createOpenApiDocument(app);
  SwaggerModule.setup('docs', app, document);
  app.getHttpAdapter().get('/openapi.json', (_request, response) => {
    response.json(document);
  });
  await app.listen(config.get<number>('PORT', 3001), '0.0.0.0');
  console.log(
    `Server is running on http://localhost:${config.get<number>('PORT', 3001)}`,
  );
}

void bootstrap();

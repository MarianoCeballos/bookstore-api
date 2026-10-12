import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import Joi from 'joi';
import { AuthModule } from 'src/modules/auth/auth.module';
import { BooksModule } from 'src/modules/books/books.module';
import { CategoriesModule } from 'src/modules/categories/categories.module';
import { AuthorsModule } from 'src/modules/authors/authors.module';
import { EmailModule } from 'src/modules/email/email.module';
import { HealthModule } from 'src/modules/health/health.module';
import { PaymentsModule } from 'src/modules/payments/payments.module';
import { ReviewsModule } from 'src/modules/reviews/reviews.module';
import { StatsModule } from 'src/modules/stats/stats.module';
import { UsersModule } from 'src/modules/users/users.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserEntity } from 'src/core/entities/user.entity';

const entities = [
  AuthorEntity,
  BookEntity,
  CartItemEntity,
  CategoryEntity,
  FavoriteEntity,
  OrderEntity,
  OrderItemEntity,
  ReviewEntity,
  ReviewReportEntity,
  UserEntity,
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3001),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN_SECONDS: Joi.number().integer().positive().default(86400),
        FRONTEND_URL: Joi.string().uri().required(),
        MERCADOPAGO_ACCESS_TOKEN: Joi.string().allow(''),
        MERCADOPAGO_WEBHOOK_SECRET: Joi.string().allow(''),
        API_PUBLIC_URL: Joi.string().allow(''),
        EMAIL_HOST: Joi.string().allow(''),
        EMAIL_PORT: Joi.number().port().default(587),
        EMAIL_SECURE: Joi.boolean().default(false),
        EMAIL_USER: Joi.string().allow(''),
        EMAIL_PASSWORD: Joi.string().allow(''),
        EMAIL_FROM: Joi.string().allow(''),
        CONTACT_EMAIL: Joi.string().email().allow(''),
      }).unknown(true),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: process.env.NODE_ENV !== 'production' && process.env.OPENAPI_ONLY !== 'true',
      },
      resolvers: [AcceptLanguageResolver],
    }),
    MikroOrmModule.forRootAsync({
      driver: PostgreSqlDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        driver: PostgreSqlDriver,
        clientUrl: config.getOrThrow<string>('DATABASE_URL'),
        connect: process.env.OPENAPI_ONLY !== 'true',
        driverOptions: {
          connection: {
            ssl: config.get<string>('NODE_ENV') === 'production',
          },
        },
        entities,
        extensions: [Migrator, SeedManager],
        migrations: {
          path: 'dist/core/database/migrations',
          pathTs: 'src/core/database/migrations',
          transactional: true,
          allOrNothing: true,
        },
        seeder: {
          path: 'dist/core/database/seeders',
          pathTs: 'src/core/database/seeders',
          defaultSeeder: 'DatabaseSeeder',
        },
      }),
    }),
    AuthModule,
    AuthorsModule,
    BooksModule,
    CategoriesModule,
    EmailModule,
    HealthModule,
    PaymentsModule,
    ReviewsModule,
    StatsModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

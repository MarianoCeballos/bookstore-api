import 'dotenv/config';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
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

export default defineConfig({
  driverOptions: {
    connection: {
      ssl: process.env.NODE_ENV === 'production',
    },
  },
  clientUrl: process.env.DATABASE_URL,
  entities: [
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
  ],
  extensions: [Migrator, SeedManager],
  metadataProvider: TsMorphMetadataProvider,
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
});

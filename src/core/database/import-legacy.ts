import 'dotenv/config';
import { AnyEntity, MikroORM } from '@mikro-orm/core';
import { Pool } from 'pg';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CartItemEntity } from 'src/core/entities/cart-item.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { FavoriteEntity } from 'src/core/entities/favorite.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { OrderItemEntity } from 'src/core/entities/order-item.entity';
import { OrderStatus } from 'src/core/enums/order-status.enum';
import { ReviewEntity } from 'src/core/entities/review.entity';
import { ReviewReportEntity } from 'src/core/entities/review-report.entity';
import { UserEntity } from 'src/core/entities/user.entity';
import { UserRole } from 'src/core/enums/user-role.enum';
import mikroOrmConfig from 'src/core/database/mikro-orm.config';

type LegacyRow = Record<string, unknown>;

function field(row: LegacyRow, ...names: string[]): unknown {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const key = Object.keys(row).find((name) => wanted.has(name.toLowerCase()));
  return key ? row[key] : undefined;
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Legacy record is missing ${fieldName}`);
  }
  return value.trim();
}

function requiredId(value: unknown, fieldName: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error(`Legacy record has an invalid ${fieldName}`);
  }
  return id;
}

function optionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

function decimal(value: unknown, fieldName: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount >= 10_000_000_000) {
    throw new Error(`Legacy record has an invalid ${fieldName}`);
  }
  return amount.toFixed(2);
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function numericList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0);
  }
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value
      .slice(1, -1)
      .split(',')
      .map(Number)
      .filter((id) => Number.isSafeInteger(id) && id > 0);
  }
  return [];
}

function relationId(row: LegacyRow, relation: 'user' | 'book'): number {
  const normalized = Object.keys(row).map((key) => ({
    key,
    normalized: key.toLowerCase().replaceAll('_', ''),
  }));
  const match = normalized.find(({ normalized: key }) =>
    relation === 'user'
      ? ['userid', 'usersid'].includes(key)
      : ['bookid', 'booksid'].includes(key),
  );
  if (!match) {
    throw new Error(`Legacy association is missing its ${relation} ID`);
  }
  return requiredId(row[match.key], `${relation} ID`);
}

function relationStatus(value: unknown): OrderStatus {
  const status = String(value ?? '').toLowerCase();
  if (status === 'approved' || status === 'success' || status === 'paid') {
    return OrderStatus.APPROVED;
  }
  if (status === 'rejected' || status === 'failure' || status === 'failed') {
    return OrderStatus.REJECTED;
  }
  if (status === 'cancelled' || status === 'canceled') {
    return OrderStatus.CANCELLED;
  }
  return OrderStatus.PENDING;
}

async function readTable(pool: Pool, table: string): Promise<LegacyRow[]> {
  const exists = await pool.query<{ table_name: string | null }>(
    'select to_regclass($1) as table_name',
    [`public.${table}`],
  );
  if (!exists.rows[0]?.table_name) {
    return [];
  }
  const result = await pool.query<LegacyRow>(`select * from public."${table}"`);
  return result.rows;
}

async function importData(): Promise<void> {
  const legacyUrl = process.env.LEGACY_DATABASE_URL;
  if (!legacyUrl) {
    throw new Error('LEGACY_DATABASE_URL must point to the source database');
  }
  if (process.env.IMPORT_LEGACY_DATA !== 'YES') {
    throw new Error('Set IMPORT_LEGACY_DATA=YES to confirm this one-time import');
  }
  const legacyPool = new Pool({
    connectionString: legacyUrl,
    ssl: process.env.LEGACY_DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  });
  const orm = await MikroORM.init(mikroOrmConfig);
  try {
    const [
      users,
      authors,
      categories,
      books,
      reviews,
      payments,
      favorites,
      cartItems,
    ] = await Promise.all([
      readTable(legacyPool, 'users'),
      readTable(legacyPool, 'authors'),
      readTable(legacyPool, 'categories'),
      readTable(legacyPool, 'books'),
      readTable(legacyPool, 'reviews'),
      readTable(legacyPool, 'payments'),
      readTable(legacyPool, 'user_bookfav'),
      readTable(legacyPool, 'user_bookcart'),
    ]);
    await orm.em.transactional(async (em) => {
      if (
        (await em.count(UserEntity)) > 0 ||
        (await em.count(BookEntity)) > 0 ||
        (await em.count(OrderEntity)) > 0
      ) {
        throw new Error('The destination database must not contain users, books, or orders');
      }
      const created: AnyEntity[] = [];
      const usersById = new Map<number, UserEntity>();
      const authorsByName = new Map<string, AuthorEntity>();
      const categoriesByName = new Map<string, CategoryEntity>();
      const categoriesById = new Map<number, CategoryEntity>();
      const booksById = new Map<number, BookEntity>();

      for (const row of users) {
        const user = em.create(UserEntity, {
          ID: requiredId(field(row, 'ID'), 'user ID'),
          name: requiredString(field(row, 'name'), 'user name'),
          surname: requiredString(field(row, 'surname'), 'user surname'),
          username: requiredString(field(row, 'username'), 'username').toLowerCase(),
          email: requiredString(field(row, 'email'), 'email').toLowerCase(),
          profilePic: typeof field(row, 'profilePic') === 'string'
            ? String(field(row, 'profilePic'))
            : undefined,
          enabled: Boolean(field(row, 'enabled')),
          banned: Boolean(field(row, 'banned')),
          suspendedTimes: Number(field(row, 'suspendedTimes') ?? 0),
          dateSuspended: optionalDate(field(row, 'dateSuspended')),
          role: field(row, 'admin') === true ? UserRole.ADMIN : UserRole.USER,
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        usersById.set(user.ID, user);
        created.push(user);
      }

      for (const row of authors) {
        const id = requiredId(field(row, 'ID'), 'author ID');
        const name = requiredString(field(row, 'name'), 'author name');
        if (authorsByName.has(name.toLowerCase())) {
          continue;
        }
        const author = em.create(AuthorEntity, {
          ID: id,
          name,
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        authorsByName.set(name.toLowerCase(), author);
        created.push(author);
      }

      for (const row of categories) {
        const id = requiredId(field(row, 'ID'), 'category ID');
        const name = requiredString(field(row, 'category'), 'category name');
        const existing = categoriesByName.get(name.toLowerCase());
        if (existing) {
          existing.soldCopies += Number(field(row, 'soldCopies') ?? 0);
          categoriesById.set(id, existing);
          continue;
        }
        const category = em.create(CategoryEntity, {
          ID: id,
          category: name,
          soldCopies: Number(field(row, 'soldCopies') ?? 0),
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        categoriesById.set(id, category);
        categoriesByName.set(category.category.toLowerCase(), category);
        created.push(category);
      }

      for (const row of books) {
        const book = em.create(BookEntity, {
          ID: requiredId(field(row, 'ID'), 'book ID'),
          title: requiredString(field(row, 'title'), 'book title'),
          description: requiredString(field(row, 'description'), 'book description'),
          price: decimal(field(row, 'price'), 'book price'),
          image: typeof field(row, 'image') === 'string'
            ? String(field(row, 'image'))
            : undefined,
          publisher: typeof field(row, 'publisher') === 'string'
            ? String(field(row, 'publisher'))
            : undefined,
          publishedDate: typeof field(row, 'publishedDate') === 'string'
            ? String(field(row, 'publishedDate'))
            : undefined,
          pageCount: field(row, 'pageCount') === null
            ? undefined
            : Number(field(row, 'pageCount')),
          rating: field(row, 'rating') === null
            ? undefined
            : decimal(field(row, 'rating'), 'book rating'),
          language: typeof field(row, 'language') === 'string'
            ? String(field(row, 'language'))
            : undefined,
          avgReadingTime: typeof field(row, 'avgReadingTime') === 'string'
            ? String(field(row, 'avgReadingTime'))
            : undefined,
          soldCopies: Number(field(row, 'soldCopies') ?? 0),
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        for (const name of stringList(field(row, 'authors'))) {
          const normalizedName = name.trim().toLowerCase();
          let author = authorsByName.get(normalizedName);
          if (!author) {
            author = em.create(AuthorEntity, { name: name.trim() });
            authorsByName.set(normalizedName, author);
            created.push(author);
          }
          book.authors.add(author);
        }
        for (const name of stringList(field(row, 'categories'))) {
          const normalizedName = name.trim().toLowerCase();
          let category = categoriesByName.get(normalizedName);
          if (!category) {
            category = em.create(CategoryEntity, {
              category: name.trim(),
              soldCopies: 0,
            });
            categoriesByName.set(normalizedName, category);
            created.push(category);
          }
          book.categories.add(category);
        }
        booksById.set(book.ID, book);
        created.push(book);
      }

      for (const row of reviews) {
        const book = booksById.get(relationId(row, 'book'));
        const user = usersById.get(relationId(row, 'user'));
        if (!book || !user) {
          throw new Error('Legacy review points to a missing book or user');
        }
        const review = em.create(ReviewEntity, {
          ID: requiredId(field(row, 'ID'), 'review ID'),
          title: requiredString(field(row, 'title'), 'review title'),
          review: requiredString(field(row, 'review'), 'review text'),
          rating: Number(field(row, 'rating')),
          book,
          user,
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        created.push(review);
        for (const reporterId of numericList(field(row, 'reports'))) {
          const reporter = usersById.get(reporterId);
          if (!reporter) {
            continue;
          }
          created.push(em.create(ReviewReportEntity, { review, user: reporter }));
        }
      }

      for (const row of favorites) {
        const user = usersById.get(relationId(row, 'user'));
        const book = booksById.get(relationId(row, 'book'));
        if (user && book) {
          created.push(em.create(FavoriteEntity, { user, book }));
        }
      }
      for (const row of cartItems) {
        const user = usersById.get(relationId(row, 'user'));
        const book = booksById.get(relationId(row, 'book'));
        if (user && book) {
          created.push(em.create(CartItemEntity, { user, book }));
        }
      }

      for (const row of payments) {
        const user = usersById.get(relationId(row, 'user'));
        if (!user) {
          throw new Error('Legacy payment points to a missing user');
        }
        const items = field(row, 'items');
        if (!Array.isArray(items)) {
          throw new Error('Legacy payment has no item list');
        }
        const order = em.create(OrderEntity, {
          providerPaymentId: requiredString(field(row, 'mpID'), 'payment ID'),
          status: relationStatus(field(row, 'status')),
          total: decimal(field(row, 'total'), 'payment total'),
          gift: Boolean(field(row, 'gift')),
          giftRecipient: typeof field(row, 'giftrecipient') === 'string'
            ? String(field(row, 'giftrecipient'))
            : undefined,
          user,
          createdAt: optionalDate(field(row, 'createdAt')) ?? new Date(),
          updatedAt: optionalDate(field(row, 'updatedAt')) ?? new Date(),
        });
        created.push(order);
        for (const item of items) {
          if (!item || typeof item !== 'object') {
            throw new Error('Legacy payment contains an invalid item');
          }
          const itemRow = item as LegacyRow;
          const book = booksById.get(requiredId(field(itemRow, 'ID', 'id'), 'order book ID'));
          if (!book) {
            throw new Error('Legacy order item points to a missing book');
          }
          const quantity = Number(field(itemRow, 'quantity') ?? 1);
          if (!Number.isSafeInteger(quantity) || quantity < 1) {
            throw new Error('Legacy order item has an invalid quantity');
          }
          order.items.add(
            em.create(OrderItemEntity, {
              order,
              book,
              title: requiredString(field(itemRow, 'title'), 'order item title'),
              unitPrice: decimal(
                field(itemRow, 'unit_price', 'unitPrice', 'price'),
                'order item price',
              ),
              quantity,
            }),
          );
        }
      }

      em.persist(created);
      await em.flush();
      for (const table of ['users', 'authors', 'categories', 'books', 'reviews']) {
        await em.getConnection().execute(
          `select setval(pg_get_serial_sequence('"${table}"', 'ID'), coalesce(max("ID"), 1), max("ID") is not null) from "${table}"`,
        );
      }
      for (const category of categoriesById.values()) {
        await em.getConnection().execute(
          'update categories set sold_copies = ? where "ID" = ?',
          [category.soldCopies, category.ID],
        );
      }
    });
    process.stdout.write(
      `Imported ${users.length} users, ${books.length} books, ${reviews.length} reviews, and ${payments.length} orders.\n`,
    );
  } finally {
    await orm.close(true);
    await legacyPool.end();
  }
}

importData().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Legacy database import failed'}\n`,
  );
  process.exitCode = 1;
});

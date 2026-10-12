import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { OrderEntity } from 'src/core/entities/order.entity';
import { UserEntity } from 'src/core/entities/user.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(BookEntity)
    private readonly books: EntityRepository<BookEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categories: EntityRepository<CategoryEntity>,
    @InjectRepository(OrderEntity)
    private readonly orders: EntityRepository<OrderEntity>,
    @InjectRepository(UserEntity)
    private readonly users: EntityRepository<UserEntity>,
  ) {}

  async getStats(): Promise<Record<string, unknown>> {
    const [books, categories, orders, users] = await Promise.all([
      this.books.find({ soldCopies: { $gt: 0 } }, { fields: ['ID', 'title', 'image', 'soldCopies'] }),
      this.categories.find({ soldCopies: { $gt: 0 } }, { fields: ['ID', 'category', 'soldCopies'] }),
      this.orders.findAll({ populate: ['items'], orderBy: { createdAt: 'DESC' } }),
      this.users.findAll({ fields: ['createdAt'] }),
    ]);
    return {
      books,
      categories,
      users: {
        totalUsers: users.length,
        createdDate: users.map((user) => ({ createdAt: user.createdAt })),
      },
      payments: orders.map((order) => ({
        items: order.items.length,
        createdAt: order.createdAt,
        total: order.total,
      })),
    };
  }
}

import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { BookEntity } from 'src/core/entities/book.entity';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { BooksController } from 'src/modules/books/books.controller';
import { BooksService } from 'src/modules/books/books.service';

@Module({
  imports: [MikroOrmModule.forFeature([AuthorEntity, BookEntity, CategoryEntity])],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}

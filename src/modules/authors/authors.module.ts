import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthorEntity } from 'src/core/entities/author.entity';
import { AuthorsController } from 'src/modules/authors/authors.controller';

@Module({
  imports: [MikroOrmModule.forFeature([AuthorEntity])],
  controllers: [AuthorsController],
})
export class AuthorsModule {}

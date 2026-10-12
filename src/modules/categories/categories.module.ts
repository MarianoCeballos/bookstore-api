import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CategoryEntity } from 'src/core/entities/category.entity';
import { CategoriesController } from 'src/modules/categories/categories.controller';

@Module({
  imports: [MikroOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoriesController],
})
export class CategoriesModule {}

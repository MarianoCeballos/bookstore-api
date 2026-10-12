import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoryResponseDto } from 'src/modules/categories/dto/category-response.dto';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { CategoryEntity } from 'src/core/entities/category.entity';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categories: EntityRepository<CategoryEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List book categories' })
  @ApiOkResponse({ type: [CategoryResponseDto] })
  async getCategories(): Promise<
    Array<{ ID: number; category: string; soldCopies: number }>
  > {
    const categories = await this.categories.findAll({
      orderBy: { category: 'ASC' },
    });
    return categories.map(({ ID, category, soldCopies }) => ({
      ID,
      category,
      soldCopies,
    }));
  }
}

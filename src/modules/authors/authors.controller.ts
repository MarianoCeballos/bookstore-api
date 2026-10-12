import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { AuthorEntity } from 'src/core/entities/author.entity';

@ApiTags('authors')
@Controller('authors')
export class AuthorsController {
  constructor(
    @InjectRepository(AuthorEntity)
    private readonly authors: EntityRepository<AuthorEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List book authors' })
  async getAuthors(): Promise<Array<{ ID: number; name: string }>> {
    const authors = await this.authors.findAll({ orderBy: { name: 'ASC' } });
    return authors.map(({ ID, name }) => ({ ID, name }));
  }
}

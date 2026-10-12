import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from 'src/core/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { CreateBookDto } from 'src/modules/books/dto/create-book.dto';
import { BookQueryDto } from 'src/modules/books/dto/book-query.dto';
import { BooksService } from 'src/modules/books/books.service';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Search books and optionally filter or paginate' })
  findAll(@Query() query: BookQueryDto): Promise<unknown[]> {
    return this.books.findAll(query);
  }

  @Get('homeBooks')
  @ApiOperation({ summary: 'Get featured book collections for the home page' })
  getHomeBooks(): ReturnType<BooksService['homeBooks']> {
    return this.books.homeBooks();
  }

  @Get(':ID')
  getById(@Param('ID', ParseIntPipe) id: number): Promise<Record<string, unknown>> {
    return this.books.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() input: CreateBookDto): Promise<{ message: string }> {
    return this.books.create(input);
  }

  @Put(':ID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  update(
    @Param('ID', ParseIntPipe) id: number,
    @Body() input: CreateBookDto,
  ): Promise<{ message: string }> {
    return this.books.update(id, input);
  }

  @Delete(':ID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  delete(@Param('ID', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.books.delete(id);
  }
}

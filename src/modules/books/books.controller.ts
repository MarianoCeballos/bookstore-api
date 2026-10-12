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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MessageResponseDto } from 'src/core/dto/message-response.dto';
import {
  BookViewDto,
  HomeBooksResponseDto,
} from 'src/modules/books/dto/book-view.dto';
import { UserRole } from 'src/core/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { Roles } from 'src/core/decorators/roles.decorator';
import { CreateBookDto } from 'src/modules/books/dto/create-book.dto';
import { BookQueryDto } from 'src/modules/books/dto/book-query.dto';
import { BooksService, BookView } from 'src/modules/books/books.service';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Search books and optionally filter or paginate' })
  @ApiOkResponse({ type: [BookViewDto] })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  findAll(@Query() query: BookQueryDto): Promise<BookView[]> {
    return this.books.findAll(query);
  }

  @Get('homeBooks')
  @ApiOperation({ summary: 'Get featured book collections for the home page' })
  @ApiOkResponse({ type: HomeBooksResponseDto })
  getHomeBooks(): ReturnType<BooksService['homeBooks']> {
    return this.books.homeBooks();
  }

  @Get(':ID')
  @ApiOperation({ summary: 'Get a book by ID' })
  @ApiOkResponse({ type: BookViewDto })
  @ApiBadRequestResponse({ description: 'Invalid book ID' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  getById(@Param('ID', ParseIntPipe) id: number): Promise<BookView> {
    return this.books.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a book' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid book data' })
  @ApiConflictResponse({ description: 'Book title already exists' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  create(@Body() input: CreateBookDto): Promise<{ message: string }> {
    return this.books.create(input);
  }

  @Put(':ID')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a book' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid book data' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
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
  @ApiOperation({ summary: 'Delete a book' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid book ID' })
  @ApiNotFoundResponse({ description: 'Book not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  delete(@Param('ID', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.books.delete(id);
  }
}

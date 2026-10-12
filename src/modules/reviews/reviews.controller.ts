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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { CreateReviewDto } from 'src/modules/reviews/dto/create-review.dto';
import { UpdateReviewDto } from 'src/modules/reviews/dto/update-review.dto';
import { ReviewsService } from 'src/modules/reviews/reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  findAll(): Promise<Array<Record<string, unknown>>> {
    return this.reviews.findAll();
  }

  @Get('book/:ID')
  findByBook(@Param('ID', ParseIntPipe) id: number): Promise<Record<string, unknown>> {
    return this.reviews.findByBook(id);
  }

  @Get('user/:ID')
  findByUser(@Param('ID', ParseIntPipe) id: number): Promise<Record<string, unknown>> {
    return this.reviews.findByUser(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a book' })
  create(
    @Body() input: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.reviews.create(input, user);
  }

  @Put(':ID')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  update(
    @Param('ID', ParseIntPipe) id: number,
    @Body() input: UpdateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
    @Query('report') report?: string,
  ): Promise<{ message: string }> {
    return this.reviews.update(id, input, user, report === 'true');
  }

  @Delete(':ID')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  delete(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.reviews.delete(id, user);
  }
}

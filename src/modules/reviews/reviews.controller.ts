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
  ReviewViewDto,
  UserReviewsResponseDto,
} from 'src/modules/reviews/dto/review-view.dto';
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
  @ApiOperation({ summary: 'List all reviews' })
  @ApiOkResponse({ type: [ReviewViewDto] })
  findAll(): Promise<ReviewViewDto[]> {
    return this.reviews.findAll();
  }

  @Get('user/:ID')
  @ApiOperation({ summary: 'Get a user with their reviews' })
  @ApiOkResponse({ type: UserReviewsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findByUser(
    @Param('ID', ParseIntPipe) id: number,
  ): Promise<UserReviewsResponseDto> {
    return this.reviews.findByUser(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a book' })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiNotFoundResponse({ description: 'User or book not found' })
  create(
    @Body() input: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.reviews.create(input, user);
  }

  @Put(':ID')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit a review, or report it with ?report=true' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this resource' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiConflictResponse({ description: 'Review already reported' })
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
  @ApiOperation({ summary: 'Delete a review' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid review ID' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this resource' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  delete(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.reviews.delete(id, user);
  }
}

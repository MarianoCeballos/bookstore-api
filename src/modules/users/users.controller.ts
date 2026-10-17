import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { MessageResponseDto } from 'src/core/dto/message-response.dto';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { Roles } from 'src/core/decorators/roles.decorator';
import { UserRole } from 'src/core/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import {
  BookIdDto,
  CartResponseDto,
  FavoriteBookDto,
  CartBookDto,
  FavoritesResponseDto,
  UpdateUserResponseDto,
  UserAdminViewDto,
  UserPublicViewDto,
} from 'src/modules/users/dto/user-response.dto';
import { type UploadedImageFile } from 'src/modules/users/profile-picture.util';
import { UsersService } from 'src/modules/users/users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiExtraModels(UserAdminViewDto, UpdateUserResponseDto)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List users, optionally filtered by username' })
  @ApiOkResponse({ type: [UserAdminViewDto] })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  findAll(@Query('username') username?: string): Promise<UserAdminViewDto[]> {
    return this.users.findAll(username);
  }

  @Get(':ID')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiOkResponse({ type: UserPublicViewDto })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  findById(@Param('ID', ParseIntPipe) id: number): Promise<UserPublicViewDto> {
    return this.users.findById(id);
  }

  @Put(':ID')
  @ApiOperation({
    summary:
      'Update a user, or change status with ?suspended, ?enabled or ?admin (admin only)',
  })
  @ApiOkResponse({
    description:
      'Updated profile wrapper, or the admin view when a status flag is used',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(UpdateUserResponseDto) },
        { $ref: getSchemaPath(UserAdminViewDto) },
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not allowed to modify this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'Email or username already registered' })
  update(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateUserDto,
    @Query('suspended') suspended?: string,
    @Query('enabled') enabled?: string,
    @Query('admin') admin?: string,
  ): Promise<UserAdminViewDto | UpdateUserResponseDto> {
    if (suspended) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'suspended', user);
    }
    if (enabled) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'enabled', user);
    }
    if (admin) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'admin', user);
    }
    return this.users.update(id, user, input);
  }

  @Post(':ID/profile-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiOperation({
    summary: 'Upload a profile picture (JPEG, PNG, WebP, or GIF up to 2 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: UpdateUserResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid image format or file exceeds 2 MB limit',
  })
  @ApiForbiddenResponse({ description: 'Not allowed to modify this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  uploadProfilePicture(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: UploadedImageFile,
  ): Promise<UpdateUserResponseDto> {
    console.log({ file });
    return this.users.uploadProfilePicture(id, user, file);
  }

  @Delete(':ID/profile-picture')
  @ApiOperation({ summary: 'Remove a user profile picture' })
  @ApiOkResponse({ type: UpdateUserResponseDto })
  @ApiForbiddenResponse({ description: 'Not allowed to modify this user' })
  @ApiNotFoundResponse({ description: 'User not found' })
  removeProfilePicture(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UpdateUserResponseDto> {
    return this.users.removeProfilePicture(id, user);
  }

  @Delete(':ID')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Ban a user' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  ban(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.users.ban(id, user);
  }

  @Get(':ID/favorites')
  @ApiOperation({ summary: 'List a user favorite books' })
  @ApiOkResponse({ type: [FavoriteBookDto] })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  getFavorites(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FavoriteBookDto[]> {
    return this.users.getFavorites(id, user);
  }

  @Post(':ID/favorites')
  @ApiOperation({ summary: 'Add a book to the authenticated user’s favorites' })
  @ApiCreatedResponse({ type: FavoritesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  @ApiNotFoundResponse({ description: 'User or book not found' })
  addFavorite(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<FavoritesResponseDto> {
    return this.users.addFavorite(id, input.ID, user);
  }

  @Delete(':ID/favorites')
  @ApiOperation({ summary: 'Remove a book from a user favorites' })
  @ApiOkResponse({ type: FavoritesResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  removeFavorite(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<FavoritesResponseDto> {
    return this.users.removeFavorite(id, input.ID, user);
  }

  @Get(':ID/cart')
  @ApiOperation({ summary: 'List a user cart items' })
  @ApiOkResponse({ type: [CartBookDto] })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  getCart(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CartBookDto[]> {
    return this.users.getCart(id, user);
  }

  @Post(':ID/cart')
  @ApiOperation({ summary: 'Add a book to a user cart' })
  @ApiCreatedResponse({ type: CartResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  @ApiNotFoundResponse({ description: 'User or book not found' })
  addCartItem(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<CartResponseDto> {
    return this.users.addCartItem(id, input.ID, user);
  }

  @Delete(':ID/cart')
  @ApiOperation({ summary: 'Remove a book from a user cart' })
  @ApiOkResponse({ type: CartResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiForbiddenResponse({ description: 'Not allowed to access this account' })
  removeCartItem(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<CartResponseDto> {
    return this.users.removeCartItem(id, input.ID, user);
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }
  }
}

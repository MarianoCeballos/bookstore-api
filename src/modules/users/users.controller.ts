import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { Roles } from 'src/core/decorators/roles.decorator';
import { UserRole } from 'src/core/enums/user-role.enum';
import { JwtAuthGuard } from 'src/core/guards/jwt-auth.guard';
import { RolesGuard } from 'src/core/guards/roles.guard';
import { AuthenticatedUser } from 'src/core/types/authenticated-user.type';
import { UpdateUserDto } from 'src/modules/users/dto/update-user.dto';
import { UsersService } from 'src/modules/users/users.service';

class BookIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ID!: number;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(@Query('username') username?: string): Promise<Array<Record<string, unknown>>> {
    return this.users.findAll(username);
  }

  @Get(':ID')
  @Roles(UserRole.ADMIN)
  findById(@Param('ID', ParseIntPipe) id: number): Promise<Record<string, unknown>> {
    return this.users.findById(id);
  }

  @Put(':ID')
  update(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateUserDto,
    @Query('suspended') suspended?: string,
    @Query('enabled') enabled?: string,
    @Query('admin') admin?: string,
  ): Promise<Record<string, unknown> | { message: string; data: Record<string, unknown> }> {
    if (suspended) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'suspended');
    }
    if (enabled) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'enabled');
    }
    if (admin) {
      this.assertAdmin(user);
      return this.users.setStatus(id, 'admin');
    }
    return this.users.update(id, user, input);
  }

  @Delete(':ID')
  @Roles(UserRole.ADMIN)
  ban(@Param('ID', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.users.ban(id);
  }

  @Get(':ID/favorites')
  getFavorites(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    return this.users.getFavorites(id, user);
  }

  @Post(':ID/favorites')
  @ApiOperation({ summary: 'Add a book to the authenticated user’s favorites' })
  addFavorite(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<{ data: unknown[]; message: string }> {
    return this.users.addFavorite(id, input.ID, user);
  }

  @Delete(':ID/favorites')
  removeFavorite(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<{ data: unknown[]; message: string }> {
    return this.users.removeFavorite(id, input.ID, user);
  }

  @Get(':ID/cart')
  getCart(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<unknown[]> {
    return this.users.getCart(id, user);
  }

  @Post(':ID/cart')
  addCartItem(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<{ data: unknown[]; message: string }> {
    return this.users.addCartItem(id, input.ID, user);
  }

  @Delete(':ID/cart')
  removeCartItem(
    @Param('ID', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: BookIdDto,
  ): Promise<{ data: unknown[]; message: string }> {
    return this.users.removeCartItem(id, input.ID, user);
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin role is required');
    }
  }
}

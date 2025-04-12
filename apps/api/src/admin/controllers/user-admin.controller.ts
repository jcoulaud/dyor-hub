import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserResponseDto } from '../../auth/dto/user-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UsersService } from '../../users/users.service';
import { AdminGuard } from '../admin.guard';
import { AdminUserListItemDto } from '../dto/admin-user-list-item.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UserAdminController {
  constructor(private readonly usersService: UsersService) {}

  @Get('recent')
  async getRecentUsers(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<UserResponseDto[]> {
    const users = await this.usersService.findRecentUsers(limit);
    return users.map((user) =>
      UserResponseDto.fromEntity(user, { includeCreatedAt: true }),
    );
  }

  @Get()
  async getPaginatedUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ): Promise<{
    users: AdminUserListItemDto[];
    total: number;
    totalPages: number;
  }> {
    const { data, total } = await this.usersService.findPaginatedUsers(
      page,
      limit,
      search,
    );
    const totalPages = Math.ceil(total / limit);

    return {
      users: data.map(AdminUserListItemDto.fromEntity),
      total,
      totalPages,
    };
  }
}

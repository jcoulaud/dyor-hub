import { UserActivity, UserStats } from '@dyor-hub/types';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { PaginatedResult, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':username')
  async getUserByUsername(
    @Param('username') username: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return UserResponseDto.fromEntity(user);
  }

  @Get(':username/stats')
  async getUserStats(@Param('username') username: string): Promise<UserStats> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return this.usersService.getUserStats(user.id);
  }

  @Get(':username/activity')
  async getUserActivity(
    @Param('username') username: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: string,
    @Query('sort') sort: 'recent' | 'popular' = 'recent',
  ): Promise<PaginatedResult<UserActivity>> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return this.usersService.getUserActivity(
      user.id,
      page ? parseInt(page as any, 10) : 1,
      limit ? parseInt(limit as any, 10) : 10,
      type,
      sort,
    );
  }
}

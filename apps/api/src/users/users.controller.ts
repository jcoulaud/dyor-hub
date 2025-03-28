import { UserActivity, UserStats } from '@dyor-hub/types';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { TwitterAuthenticationException } from '../auth/exceptions/auth.exceptions';
import { PaginatedResult, UsersService } from './users.service';

interface AuthenticatedRequest extends Request {
  user?: any;
}

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

  @Put('wallet')
  @UseGuards(AuthGuard('jwt'))
  async updateWalletAddress(
    @Req() req: AuthenticatedRequest,
    @Body() body: { walletAddress: string },
  ): Promise<UserResponseDto> {
    if (!req.user) {
      throw new TwitterAuthenticationException('User not authenticated');
    }

    const updatedUser = await this.usersService.updateWalletAddress(
      req.user.id,
      body.walletAddress,
    );

    return UserResponseDto.fromEntity(updatedUser);
  }
}

import { UserActivity, UserSearchResult, UserStats } from '@dyor-hub/types';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  forwardRef,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { UserFollows } from '../entities';
import { UpdateFollowPreferencesDto } from '../follows/dto/update-follow-preferences.dto';
import { FollowsService } from '../follows/follows.service';
import { TokenCallsService } from '../token-calls/token-calls.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UserTokenCallStatsDto } from './dto/user-token-call-stats.dto';
import { PaginatedResult, UsersService } from './users.service';

@Injectable()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TokenCallsService))
    private readonly tokenCallsService: TokenCallsService,
    @Inject(forwardRef(() => FollowsService))
    private readonly followsService: FollowsService,
  ) {}

  @Public()
  @Get('search')
  async searchUsers(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ): Promise<UserSearchResult[]> {
    if (!query || query.length < 1) {
      return [];
    }
    const numericLimit = limit ? parseInt(limit, 10) : 10;
    return this.usersService.searchUsers(query, numericLimit);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('me/preferences')
  async getMyPreferences(
    @CurrentUser() user: { id: string },
  ): Promise<Record<string, any>> {
    if (!user?.id) {
      // Only send default public preferences
      return { tokenChartDisplay: 'price' };
    }
    return this.usersService.getUserPreferences(user.id);
  }

  @UseGuards(OptionalAuthGuard)
  @Patch('me/preferences')
  async updateMyPreferences(
    @CurrentUser() user: { id: string },
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<Record<string, any>> {
    if (!user?.id) {
      return updatePreferencesDto.preferences;
    }
    return this.usersService.updateUserPreferences(
      user.id,
      updatePreferencesDto.preferences,
    );
  }

  @Public()
  @Get(':username')
  async getUserByUsername(
    @Param('username') username: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      this.logger.warn(`User with username ${username} not found`);
      throw new NotFoundException(`User with username ${username} not found`);
    }

    const [followersCount, followingCount] = await Promise.all([
      this.followsService.getFollowersCount(user.id),
      this.followsService.getFollowingCount(user.id),
    ]);

    return UserResponseDto.fromEntity(user, { followersCount, followingCount });
  }

  @Public()
  @Get(':username/stats')
  async getUserStats(@Param('username') username: string): Promise<UserStats> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    const stats = await this.usersService.getUserStats(user.id);

    return stats;
  }

  @Public()
  @Get(':username/activity')
  async getUserActivity(
    @Param('username') username: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('type') type?: string,
    @Query('sort') sort: 'recent' | 'popular' = 'recent',
    @Query('search') search?: string,
  ): Promise<PaginatedResult<UserActivity>> {
    const user = await this.usersService.findByUsername(username);

    if (!user) {
      this.logger.warn(`User with username ${username} not found for activity`);
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return this.usersService.getUserActivity(
      user.id,
      page ? parseInt(page as any, 10) : 1,
      limit ? parseInt(limit as any, 10) : 10,
      type,
      sort,
      search,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async followUser(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) followedId: string,
  ): Promise<void> {
    const followerId = user.id;
    await this.followsService.followUser(followerId, followedId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) followedId: string,
  ): Promise<void> {
    const followerId = user.id;
    await this.followsService.unfollowUser(followerId, followedId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/follow/details')
  async getFollowDetails(
    @CurrentUser() currentUser: { id: string },
    @Param('id', ParseUUIDPipe) followedId: string,
  ): Promise<UserFollows> {
    const followerId = currentUser.id;
    const relationship = await this.followsService.getFollowRelationship(
      followerId,
      followedId,
    );

    if (!relationship) {
      throw new NotFoundException(
        `Follow relationship not found for follower ${followerId} and followed ${followedId}`,
      );
    }

    return relationship;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/follow/preferences')
  async updateFollowPreferences(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) followedId: string,
    @Body() preferencesDto: UpdateFollowPreferencesDto,
  ) {
    const followerId = user.id;
    await this.followsService.updateFollowPreferences(
      followerId,
      followedId,
      preferencesDto,
    );
    return { success: true };
  }

  @Public()
  @Post('follow-status')
  async getFollowRelationship(
    @Body() relationshipDto: { followerId: string; followedId: string },
  ) {
    const relationship = await this.followsService.getFollowRelationship(
      relationshipDto.followerId,
      relationshipDto.followedId,
    );
    return { isFollowing: !!relationship };
  }

  @Get(':id/following')
  async getFollowing(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<UserResponseDto>> {
    limit = Math.min(50, Math.max(1, limit));
    const result = await this.followsService.getFollowing(userId, page, limit);
    const data = result.data.map((user) => UserResponseDto.fromEntity(user));
    return {
      data,
      meta: result.meta,
    };
  }

  @Get(':id/followers')
  async getFollowers(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<PaginatedResult<UserResponseDto>> {
    limit = Math.min(50, Math.max(1, limit));
    const result = await this.followsService.getFollowers(userId, page, limit);
    const data = result.data.map((user) => UserResponseDto.fromEntity(user));
    return {
      data,
      meta: result.meta,
    };
  }

  @Public()
  @Get(':userId/token-call-stats')
  async getUserTokenCallStats(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserTokenCallStatsDto> {
    try {
      return await this.tokenCallsService.calculateUserStats(userId);
    } catch (error) {
      this.logger.error(
        `Failed to get token call stats for user ${userId}:`,
        error,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve user statistics.',
      );
    }
  }
}

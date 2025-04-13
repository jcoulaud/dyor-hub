import { UserActivity, UserStats } from '@dyor-hub/types';
import {
  Body,
  Controller,
  forwardRef,
  Get,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { UserResponseDto } from '../auth/dto/user-response.dto';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
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
  ) {}

  @UseGuards(OptionalAuthGuard)
  @Get('me/preferences')
  async getMyPreferences(@Request() req): Promise<Record<string, any>> {
    if (!req.user?.id) {
      // Only send default public preferences
      return { tokenChartDisplay: 'price' };
    }
    return this.usersService.getUserPreferences(req.user.id);
  }

  @UseGuards(OptionalAuthGuard)
  @Patch('me/preferences')
  async updateMyPreferences(
    @Request() req,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<Record<string, any>> {
    if (!req.user?.id) {
      return updatePreferencesDto.preferences;
    }
    return this.usersService.updateUserPreferences(
      req.user.id,
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

    return UserResponseDto.fromEntity(user);
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
    );
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

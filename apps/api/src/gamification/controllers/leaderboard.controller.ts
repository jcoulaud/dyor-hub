import {
  LeaderboardCategory,
  LeaderboardResponse,
  LeaderboardTimeframe,
} from '@dyor-hub/types';
import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../admin/admin.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LeaderboardService } from '../services/leaderboard.service';

@Controller('leaderboards')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @Public()
  async getLeaderboard(
    @Query('category', new ParseEnumPipe(LeaderboardCategory))
    category: LeaderboardCategory,
    @Query('timeframe', new ParseEnumPipe(LeaderboardTimeframe))
    timeframe: LeaderboardTimeframe,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<LeaderboardResponse> {
    return this.leaderboardService.getLeaderboard(
      category,
      timeframe,
      page,
      pageSize,
    );
  }

  @Get('user-position')
  @UseGuards(JwtAuthGuard)
  async getUserPosition(
    @CurrentUser() user: { id: string },
    @Query('category', new ParseEnumPipe(LeaderboardCategory))
    category: LeaderboardCategory,
    @Query('timeframe', new ParseEnumPipe(LeaderboardTimeframe))
    timeframe: LeaderboardTimeframe,
  ) {
    return this.leaderboardService.getUserPosition(
      user.id,
      category,
      timeframe,
    );
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getCurrentUserRanks(@CurrentUser() user: { id: string }) {
    return this.leaderboardService.getUserRanks(user.id);
  }

  @Get('user/:userId')
  @Public()
  async getUserRanks(@Param('userId') userId: string) {
    return this.leaderboardService.getUserRanks(userId);
  }

  @Post('recalculate')
  @UseGuards(AdminGuard)
  async recalculateLeaderboards() {
    await this.leaderboardService.forceLeaderboardRecalculation();
    return { message: 'Leaderboard recalculation triggered' };
  }
}

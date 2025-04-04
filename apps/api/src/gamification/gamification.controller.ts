import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../entities';
import { ActivityTrackingService } from './services/activity-tracking.service';

@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
  ) {}

  @Get('streak')
  @UseGuards(AuthGuard)
  async getCurrentUserStreak(@CurrentUser() user: UserEntity) {
    const streak = await this.activityTrackingService.getUserStreak(user.id);

    return {
      currentStreak: streak?.currentStreak || 0,
      longestStreak: streak?.longestStreak || 0,
      lastActivityDate: streak?.lastActivityDate || null,
    };
  }

  @Get('users/:userId/streak')
  @UseGuards(AuthGuard)
  async getUserStreak(@Param('userId') userId: string) {
    return this.activityTrackingService.getUserStreak(userId);
  }

  @Get('streaks/at-risk')
  @UseGuards(AuthGuard)
  async getStreaksAtRisk() {
    return this.activityTrackingService.getStreaksAtRisk();
  }

  @Get('streak/at-risk')
  @UseGuards(AuthGuard)
  async checkStreakAtRisk(@CurrentUser() user: UserEntity) {
    const isAtRisk = await this.activityTrackingService.checkStreakAtRisk(
      user.id,
    );

    return {
      isAtRisk,
    };
  }
}

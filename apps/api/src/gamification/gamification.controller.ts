import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ActivityType, UserActivityEntity, UserEntity } from '../entities';
import { UserBadgeEntity } from '../entities/user-badge.entity';
import { ActivityTrackingService } from './services/activity-tracking.service';
import { BadgeService } from './services/badge.service';

@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
    private readonly badgeService: BadgeService,
    @InjectRepository(UserActivityEntity)
    private readonly userActivityRepository: Repository<UserActivityEntity>,
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

  @Public()
  @Get('users/:userId/streak')
  async getUserStreak(@Param('userId') userId: string) {
    return this.activityTrackingService.getUserStreak(userId);
  }

  @Public()
  @Get('streaks/at-risk')
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

  @Get('badges')
  @UseGuards(AuthGuard)
  async getCurrentUserBadges(@CurrentUser() user: UserEntity) {
    return this.badgeService.getUserBadges(user.id);
  }

  @Public()
  @Get('badges/available')
  async getAvailableBadges(@CurrentUser() user?: UserEntity) {
    return this.badgeService.getAvailableBadges(user?.id);
  }

  @Get('badges/summary')
  @UseGuards(AuthGuard)
  async getUserBadgeSummary(@CurrentUser() user: UserEntity) {
    return this.badgeService.getUserBadgeSummary(user.id);
  }

  @Public()
  @Get('users/:userId/badges')
  async getUserBadges(@Param('userId') userId: string) {
    return this.badgeService.getUserBadges(userId);
  }

  @Public()
  @Get('users/:userId/badges/summary')
  async getOtherUserBadgeSummary(@Param('userId') userId: string) {
    return this.badgeService.getUserBadgeSummary(userId);
  }

  @Post('badges/check')
  @UseGuards(AuthGuard)
  async checkBadges(
    @CurrentUser() user: UserEntity,
  ): Promise<UserBadgeEntity[]> {
    return this.badgeService.forceCheckAndAwardBadges(user.id);
  }

  @Patch('badges/:badgeId/display')
  @UseGuards(AuthGuard)
  async toggleBadgeDisplay(
    @CurrentUser() user: UserEntity,
    @Param('badgeId') badgeId: string,
    @Body() { isDisplayed }: { isDisplayed: boolean },
  ) {
    return this.badgeService.toggleBadgeDisplay(user.id, badgeId, isDisplayed);
  }

  /**
   * Endpoint for daily check-ins when users visit the site
   * This will register a login activity only if the user hasn't already
   * performed one today, maintaining their streak.
   */
  @Post('check-in')
  @UseGuards(AuthGuard)
  async checkIn(@CurrentUser() user: UserEntity) {
    try {
      // Get today's start and end timestamps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if user already had login activity today
      const existingLoginActivity = await this.userActivityRepository.findOne({
        where: {
          userId: user.id,
          activityType: ActivityType.LOGIN,
          createdAt: Between(today, tomorrow),
        },
      });

      // If no login activity today, register one
      if (!existingLoginActivity) {
        await this.activityTrackingService.trackActivity(
          user.id,
          ActivityType.LOGIN,
        );
        return { success: true, message: 'Daily check-in successful' };
      }

      return { success: true, message: 'Already checked in today' };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check in',
        error: error.message,
      };
    }
  }
}

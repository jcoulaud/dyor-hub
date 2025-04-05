import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BadgeCategory, UserActivityEntity, UserEntity } from '../entities';
import { ACTIVITY_POINTS } from './constants/reputation-points';
import { ActivityPointsResponseDto } from './dto/reputation.dto';
import { ActivityTrackingService } from './services/activity-tracking.service';
import { BadgeService } from './services/badge.service';

@Controller('gamification')
export class GamificationController {
  constructor(
    private readonly activityTrackingService: ActivityTrackingService,
    private readonly badgeService: BadgeService,
    @InjectRepository(UserActivityEntity)
    private userActivityRepository: Repository<UserActivityEntity>,
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

  @Get('badges')
  @UseGuards(AuthGuard)
  async getCurrentUserBadges(@CurrentUser() user: UserEntity) {
    return this.badgeService.getUserBadges(user.id);
  }

  @Get('badges/available')
  @UseGuards(AuthGuard)
  async getAvailableBadges(@CurrentUser() user: UserEntity) {
    return this.badgeService.getAvailableBadges(user.id);
  }

  @Get('badges/summary')
  @UseGuards(AuthGuard)
  async getUserBadgeSummary(@CurrentUser() user: UserEntity) {
    return this.badgeService.getUserBadgeSummary(user.id);
  }

  @Get('badges/categories')
  async getBadgeCategories() {
    return this.badgeService.getAllBadgeCategories();
  }

  @Get('badges/category/:category')
  async getBadgesByCategory(@Param('category') category: BadgeCategory) {
    return this.badgeService.getBadgesByCategory(category);
  }

  @Get('users/:userId/badges')
  @UseGuards(AuthGuard)
  async getUserBadges(@Param('userId') userId: string) {
    return this.badgeService.getUserBadges(userId);
  }

  @Get('users/:userId/badges/summary')
  @UseGuards(AuthGuard)
  async getOtherUserBadgeSummary(@Param('userId') userId: string) {
    return this.badgeService.getUserBadgeSummary(userId);
  }

  @Post('badges/check')
  @UseGuards(AuthGuard)
  async checkAndAwardBadges(@CurrentUser() user: UserEntity) {
    return this.badgeService.checkAndAwardBadges(user.id);
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

  @Get('users/:userId/activities/points')
  @UseGuards(AuthGuard)
  async getUserActivitiesWithPoints(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ActivityPointsResponseDto[]> {
    const activities = await this.userActivityRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });
    return activities.map((activity) => ({
      activityType: activity.activityType,
      points: ACTIVITY_POINTS[activity.activityType] || 0,
    }));
  }
}

import { forwardRef, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  BadgeEntity,
  LeaderboardEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserReputationEntity,
  UserStreakEntity,
} from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { GamificationController } from './gamification.controller';
import { ActivityHooksService } from './services/activity-hooks.service';
import { ActivityTrackingService } from './services/activity-tracking.service';
import { BadgeService } from './services/badge.service';
import { StreakSchedulerService } from './services/streak-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserActivityEntity,
      UserStreakEntity,
      BadgeEntity,
      UserBadgeEntity,
      UserReputationEntity,
      LeaderboardEntity,
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [GamificationController],
  providers: [
    ActivityTrackingService,
    StreakSchedulerService,
    ActivityHooksService,
    BadgeService,
  ],
  exports: [ActivityTrackingService, ActivityHooksService, BadgeService],
})
export class GamificationModule {}

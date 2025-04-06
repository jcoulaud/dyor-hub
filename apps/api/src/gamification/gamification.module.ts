import { forwardRef, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  LeaderboardEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserReputationEntity,
  UserStreakEntity,
} from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaderboardController } from './controllers/leaderboard.controller';
import { ReputationController } from './controllers/reputation.controller';
import { StreakController } from './controllers/streak.controller';
import { GamificationController } from './gamification.controller';
import { ActivityHooksService } from './services/activity-hooks.service';
import { ActivityTrackingService } from './services/activity-tracking.service';
import { BadgeService } from './services/badge.service';
import { LeaderboardService } from './services/leaderboard.service';
import { ReputationService } from './services/reputation.service';
import { StreakSchedulerService } from './services/streak-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserActivityEntity,
      UserStreakEntity,
      BadgeEntity,
      UserBadgeEntity,
      UserReputationEntity,
      UserEntity,
      LeaderboardEntity,
      CommentEntity,
      CommentVoteEntity,
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    GamificationController,
    ReputationController,
    LeaderboardController,
    StreakController,
  ],
  providers: [
    ActivityTrackingService,
    StreakSchedulerService,
    ActivityHooksService,
    BadgeService,
    ReputationService,
    LeaderboardService,
  ],
  exports: [
    ActivityTrackingService,
    ActivityHooksService,
    BadgeService,
    ReputationService,
    LeaderboardService,
  ],
})
export class GamificationModule {}

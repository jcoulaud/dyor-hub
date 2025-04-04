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
import { GamificationController } from './gamification.controller';
import { ActivityHooksService } from './services/activity-hooks.service';
import { ActivityTrackingService } from './services/activity-tracking.service';
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
  ],
  controllers: [GamificationController],
  providers: [
    ActivityTrackingService,
    StreakSchedulerService,
    ActivityHooksService,
  ],
  exports: [ActivityTrackingService, ActivityHooksService],
})
export class GamificationModule {}

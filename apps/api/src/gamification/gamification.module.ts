import { forwardRef, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  BadgeEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserReputationEntity,
  UserStreakEntity,
} from '../entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReputationController } from './controllers/reputation.controller';
import { GamificationController } from './gamification.controller';
import { ActivityHooksService } from './services/activity-hooks.service';
import { ActivityTrackingService } from './services/activity-tracking.service';
import { BadgeService } from './services/badge.service';
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
    ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    forwardRef(() => AuthModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [GamificationController, ReputationController],
  providers: [
    ActivityTrackingService,
    StreakSchedulerService,
    ActivityHooksService,
    BadgeService,
    ReputationService,
  ],
  exports: [
    ActivityTrackingService,
    ActivityHooksService,
    BadgeService,
    ReputationService,
  ],
})
export class GamificationModule {}

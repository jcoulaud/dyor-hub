import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import {
  BadgeEntity,
  UserBadgeEntity,
  UserEntity,
  UserStreakEntity,
} from '../entities';
import { GamificationModule } from '../gamification/gamification.module';
import { AdminGuard } from './admin.guard';
import { BadgeAdminController } from './controllers/badge-admin.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';
import { StreakAdminController } from './controllers/streak-admin.controller';
import { BadgeAdminService } from './services/badge-admin.service';
import { StreakAdminService } from './services/streak-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BadgeEntity,
      UserBadgeEntity,
      UserStreakEntity,
      UserEntity,
    ]),
    EventEmitterModule.forRoot(),
    AuthModule,
    GamificationModule,
  ],
  controllers: [
    BadgeAdminController,
    StreakAdminController,
    ReputationAdminController,
  ],
  providers: [AdminGuard, BadgeAdminService, StreakAdminService],
  exports: [AdminGuard],
})
export class AdminModule {}

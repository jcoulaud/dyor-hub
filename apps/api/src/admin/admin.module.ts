import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { BackfillService } from '../backfill/backfill.service';
import {
  BadgeEntity,
  TokenCallEntity,
  UserBadgeEntity,
  UserEntity,
  UserStreakEntity,
} from '../entities';
import { GamificationModule } from '../gamification/gamification.module';
import { TokensModule } from '../tokens/tokens.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { BackfillAdminController } from './controllers/backfill-admin.controller';
import { BadgeAdminController } from './controllers/badge-admin.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';
import { StreakAdminController } from './controllers/streak-admin.controller';
import { UserAdminController } from './controllers/user-admin.controller';
import { BadgeAdminService } from './services/badge-admin.service';
import { StreakAdminService } from './services/streak-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BadgeEntity,
      UserBadgeEntity,
      UserStreakEntity,
      UserEntity,
      TokenCallEntity,
    ]),
    EventEmitterModule.forRoot(),
    AuthModule,
    GamificationModule,
    UsersModule,
    TokensModule,
  ],
  controllers: [
    BadgeAdminController,
    StreakAdminController,
    ReputationAdminController,
    UserAdminController,
    BackfillAdminController,
  ],
  providers: [
    AdminGuard,
    BadgeAdminService,
    StreakAdminService,
    BackfillService,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}

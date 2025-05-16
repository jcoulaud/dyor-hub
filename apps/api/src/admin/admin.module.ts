import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import {
  BadgeEntity,
  CommentEntity,
  TokenCallEntity,
  TokenEntity,
  UserBadgeEntity,
  UserEntity,
  UserStreakEntity,
} from '../entities';
import { GamificationModule } from '../gamification/gamification.module';
import { TokensModule } from '../tokens/tokens.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';
import { BadgeAdminController } from './controllers/badge-admin.controller';
import { DevAdminController } from './controllers/dev-admin.controller';
import { ReputationAdminController } from './controllers/reputation-admin.controller';
import { StreakAdminController } from './controllers/streak-admin.controller';
import { UserAdminController } from './controllers/user-admin.controller';
import { BadgeAdminService } from './services/badge-admin.service';
import { DevAdminService } from './services/dev-admin.service';
import { StreakAdminService } from './services/streak-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BadgeEntity,
      UserBadgeEntity,
      UserStreakEntity,
      UserEntity,
      TokenCallEntity,
      CommentEntity,
      TokenEntity,
      CreditTransaction,
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
    DevAdminController,
  ],
  providers: [
    AdminGuard,
    BadgeAdminService,
    StreakAdminService,
    DevAdminService,
  ],
  exports: [AdminGuard],
})
export class AdminModule {}

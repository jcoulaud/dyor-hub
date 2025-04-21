import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommentEntity } from '../entities/comment.entity';
import { TokenCallEntity } from '../entities/token-call.entity';
import { UserActivityEntity } from '../entities/user-activity.entity';
import { UserTokenCallStreakEntity } from '../entities/user-token-call-streak.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TokensModule } from '../tokens/tokens.module';
import { TokenCallVerificationService } from './token-call-verification.service';
import { TokenCallsController } from './token-calls.controller';
import { TokenCallsService } from './token-calls.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      TokenCallEntity,
      CommentEntity,
      UserTokenCallStreakEntity,
      UserActivityEntity,
    ]),
    forwardRef(() => AuthModule),
    forwardRef(() => TokensModule),
    forwardRef(() => GamificationModule),
    NotificationsModule,
  ],
  controllers: [TokenCallsController],
  providers: [TokenCallsService, TokenCallVerificationService],
  exports: [TokenCallsService, TokenCallVerificationService],
})
export class TokenCallsModule {}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import dataSource from './datasource';
import {
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  LeaderboardEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  TokenEntity,
  TokenWatchlistEntity,
  TwitterUsernameHistoryEntity,
  // Gamification entities
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserReputationEntity,
  UserStreakEntity,
  WalletEntity,
} from './entities';
import { GamificationModule } from './gamification/gamification.module';
import { HealthModule } from './health/health.module';
import { PublicRouteMiddleware } from './middlewares/global.middleware';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionModule } from './session/session.module';
import { SolanaModule } from './solana/solana.module';
import { TokensModule } from './tokens/tokens.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(dataSource.options),
    TypeOrmModule.forFeature([
      UserEntity,
      CommentEntity,
      CommentVoteEntity,
      TokenEntity,
      TokenWatchlistEntity,
      TwitterUsernameHistoryEntity,
      WalletEntity,
      // Gamification entities
      UserActivityEntity,
      UserStreakEntity,
      BadgeEntity,
      UserBadgeEntity,
      UserReputationEntity,
      NotificationEntity,
      NotificationPreferenceEntity,
      LeaderboardEntity,
    ]),
    AuthModule,
    CommentsModule,
    TokensModule,
    WatchlistModule,
    HealthModule,
    WalletsModule,
    SolanaModule,
    UsersModule,
    GamificationModule,
    NotificationsModule,
    SessionModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply public route middleware to all routes
    consumer.apply(PublicRouteMiddleware).forRoutes('*');
  }
}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { OptionalAuthGuard } from './auth/optional-auth.guard';
import { CommentsModule } from './comments/comments.module';
import { CreditsModule } from './credits/credits.module';
import dataSource from './datasource';
import { EarlyBuyerAnalysisModule } from './early-buyer-analysis/early-buyer-analysis.module';
import {
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  EarlyTokenBuyerEntity,
  LeaderboardEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  TokenCallEntity,
  TokenEntity,
  TokenSentimentEntity,
  TokenWatchlistEntity,
  TwitterUsernameHistoryEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserReputationEntity,
  UserStreakEntity,
  WalletEntity,
} from './entities';
import { AuthMethodEntity } from './entities/auth-method.entity';
import { EventsModule } from './events/events.module';
import { FeedModule } from './feed/feed.module';
import { FollowsModule } from './follows/follows.module';
import { GamificationModule } from './gamification/gamification.module';
import { GiphyModule } from './giphy/giphy.module';
import { HealthModule } from './health/health.module';
import { ModerationModule } from './moderation/moderation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReferralModule } from './referral/referral.module';
import { SessionModule } from './session/session.module';
import { SolanaModule } from './solana/solana.module';
import { TelegramModule } from './telegram/telegram.module';
import { TippingModule } from './tipping/tipping.module';
import { TokenAiTechnicalAnalysisModule } from './token-ai-technical-analysis/token-ai-technical-analysis.module';
import { TokenCallsLeaderboardModule } from './token-calls-leaderboard/tokenCallsLeaderboard.module';
import { TokenCallsModule } from './token-calls/token-calls.module';
import { TokenHolderAnalysisModule } from './token-holder-analysis/token-holder-analysis.module';
import { TokensModule } from './tokens/tokens.module';
import { TopTradersAnalysisModule } from './top-traders-analysis/top-traders-analysis.module';
import { TwitterAutomationModule } from './twitter-automation/twitter-automation.module';
import { TwitterModule } from './twitter/twitter.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRoot(dataSource.options),
    TypeOrmModule.forFeature([
      AuthMethodEntity,
      UserEntity,
      CommentEntity,
      CommentVoteEntity,
      TokenEntity,
      TokenWatchlistEntity,
      TwitterUsernameHistoryEntity,
      WalletEntity,
      UserActivityEntity,
      UserStreakEntity,
      BadgeEntity,
      UserBadgeEntity,
      UserReputationEntity,
      NotificationEntity,
      NotificationPreferenceEntity,
      LeaderboardEntity,
      TokenSentimentEntity,
      TokenCallEntity,
      EarlyTokenBuyerEntity,
    ]),
    AuthModule,
    CommentsModule,
    TokensModule,
    WatchlistModule,
    HealthModule,
    WalletsModule,
    SolanaModule,
    UsersModule,
    SessionModule,
    AdminModule,
    GamificationModule,
    NotificationsModule,
    TelegramModule,
    GiphyModule,
    TokenCallsModule,
    TokenCallsLeaderboardModule,
    FollowsModule,
    FeedModule,
    ReferralModule,
    TippingModule,
    UploadsModule,
    ModerationModule,
    TokenHolderAnalysisModule,
    CreditsModule,
    EventsModule,
    TokenAiTechnicalAnalysisModule,
    TwitterModule,
    TwitterAutomationModule,
    EarlyBuyerAnalysisModule,
    TopTradersAnalysisModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OptionalAuthGuard,
    },
  ],
})
export class AppModule {}

import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { CreditsModule } from '../credits/credits.module';
import { EarlyTokenBuyerEntity, TokenEntity, WalletEntity } from '../entities';
import { CommentEntity } from '../entities/comment.entity';
import { TokenSentimentEntity } from '../entities/token-sentiment.entity';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { UserEntity } from '../entities/user.entity';
import { UsersModule } from '../users/users.module';
import { WalletsModule } from '../wallets/wallets.module';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { TokenSentimentController } from './token-sentiment.controller';
import { TokenSentimentService } from './token-sentiment.service';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TwitterFeedService } from './twitter-feed.service';
import { TwitterHistoryService } from './twitter-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      WalletEntity,
      CommentEntity,
      TwitterUsernameHistoryEntity,
      TokenWatchlistEntity,
      TokenSentimentEntity,
      UserEntity,
      EarlyTokenBuyerEntity,
    ]),
    HttpModule,
    ConfigModule,
    WalletsModule,
    forwardRef(() => WatchlistModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CommentsModule),
    forwardRef(() => UsersModule),
    forwardRef(() => CreditsModule),
  ],
  controllers: [TokensController, TokenSentimentController],
  providers: [
    TokensService,
    TwitterHistoryService,
    TokenSentimentService,
    TwitterFeedService,
  ],
  exports: [TokensService, TokenSentimentService],
})
export class TokensModule {}

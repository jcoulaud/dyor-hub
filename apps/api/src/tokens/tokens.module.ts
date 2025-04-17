import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { CommentEntity } from '../entities/comment.entity';
import { TokenSentimentEntity } from '../entities/token-sentiment.entity';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { TokenSentimentController } from './token-sentiment.controller';
import { TokenSentimentService } from './token-sentiment.service';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      TwitterUsernameHistoryEntity,
      TokenWatchlistEntity,
      TokenSentimentEntity,
      UserEntity,
      CommentEntity,
    ]),
    forwardRef(() => WatchlistModule),
    forwardRef(() => AuthModule),
    forwardRef(() => CommentsModule),
  ],
  controllers: [TokensController, TokenSentimentController],
  providers: [TokensService, TwitterHistoryService, TokenSentimentService],
  exports: [TokensService, TokenSentimentService],
})
export class TokensModule {}

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenEntity,
      TwitterUsernameHistoryEntity,
      TokenWatchlistEntity,
      UserEntity,
    ]),
    forwardRef(() => WatchlistModule),
    AuthModule,
  ],
  controllers: [TokensController],
  providers: [TokensService, TwitterHistoryService],
  exports: [TokensService],
})
export class TokensModule {}

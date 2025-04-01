import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { WatchlistModule } from '../watchlist/watchlist.module';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TwitterHistoryService } from './twitter-history.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, TwitterUsernameHistoryEntity]),
    WatchlistModule,
    AuthModule,
  ],
  controllers: [TokensController],
  providers: [TokensService, TwitterHistoryService],
})
export class TokensModule {}

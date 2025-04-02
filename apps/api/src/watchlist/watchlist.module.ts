import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { TokensModule } from '../tokens/tokens.module';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenWatchlistEntity, TokenEntity, UserEntity]),
    forwardRef(() => TokensModule),
  ],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}

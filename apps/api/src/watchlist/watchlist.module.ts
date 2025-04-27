import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenWatchlistFolderItemEntity } from '../entities/token-watchlist-folder-item.entity';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserWatchlistFolderItemEntity } from '../entities/user-watchlist-folder-item.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistFolderEntity } from '../entities/watchlist-folder.entity';
import { TokensModule } from '../tokens/tokens.module';
import { WalletsModule } from '../wallets/wallets.module';
import { WatchlistFolderController } from './watchlist-folder.controller';
import { WatchlistFolderService } from './watchlist-folder.service';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TokenWatchlistEntity,
      TokenEntity,
      UserEntity,
      WatchlistFolderEntity,
      TokenWatchlistFolderItemEntity,
      UserWatchlistFolderItemEntity,
    ]),
    forwardRef(() => TokensModule),
    WalletsModule,
  ],
  controllers: [WatchlistController, WatchlistFolderController],
  providers: [WatchlistService, WatchlistFolderService],
  exports: [WatchlistService, WatchlistFolderService],
})
export class WatchlistModule {}

import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import { CommentVoteEntity } from '../entities/comment-vote.entity';
import { CommentEntity } from '../entities/comment.entity';
import { TokenWatchlistEntity } from '../entities/token-watchlist.entity';
import { TokenEntity } from '../entities/token.entity';
import { TwitterUsernameHistoryEntity } from '../entities/twitter-username-history.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService,
  ): Promise<TypeOrmModuleOptions> => {
    const config = {
      type: 'postgres' as const,
      url: configService.get('DATABASE_URL'),
      entities: [
        TokenEntity,
        CommentEntity,
        CommentVoteEntity,
        UserEntity,
        TwitterUsernameHistoryEntity,
        WalletEntity,
        TokenWatchlistEntity,
      ],
      synchronize: configService.get('NODE_ENV') !== 'production',
      logging: false,
      ssl: false,
    };

    return config;
  },
};

import { config } from 'dotenv';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CreditTransaction } from './credits/entities/credit-transaction.entity';
import {
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  EarlyTokenBuyerEntity,
  LeaderboardEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  TelegramUserConnectionEntity,
  TokenCallEntity,
  TokenEntity,
  TokenSentimentEntity,
  TokenWatchlistEntity,
  TokenWatchlistFolderItemEntity,
  TwitterUsernameHistoryEntity,
  UserActivityEntity,
  UserBadgeEntity,
  UserEntity,
  UserFollows,
  UserReputationEntity,
  UserStreakEntity,
  UserTokenCallStreakEntity,
  UserWatchlistFolderItemEntity,
  WalletEntity,
  WatchlistFolderEntity,
} from './entities';
import { Referral } from './entities/referral.entity';
import { Tip } from './entities/tip.entity';

config(); // Load .env file

// Determine if we're in production or development
const isProduction = process.env.NODE_ENV === 'production';

// Set the migrations path based on environment
const migrationsPath = isProduction
  ? [path.join(__dirname, 'migrations', '*.js')] // For production (compiled JS)
  : [path.join(__dirname, 'migrations', '*.ts')]; // For development (TypeScript files)

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    TokenEntity,
    CommentEntity,
    CommentVoteEntity,
    UserEntity,
    TwitterUsernameHistoryEntity,
    WalletEntity,
    TokenWatchlistEntity,
    EarlyTokenBuyerEntity,
    // Watchlist folder entities
    WatchlistFolderEntity,
    TokenWatchlistFolderItemEntity,
    UserWatchlistFolderItemEntity,
    // Gamification entities
    UserActivityEntity,
    UserStreakEntity,
    BadgeEntity,
    UserBadgeEntity,
    UserReputationEntity,
    NotificationEntity,
    NotificationPreferenceEntity,
    LeaderboardEntity,
    TelegramUserConnectionEntity,
    TokenSentimentEntity,
    TokenCallEntity,
    UserTokenCallStreakEntity,
    UserFollows,
    Referral,
    Tip,
    CreditTransaction,
  ],
  migrations: migrationsPath,
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: true,
  synchronize: false,
  logging:
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['error', 'warn'],
  logger: 'advanced-console',
};

const dataSource = new DataSource(dataSourceOptions);

// Simplified initialization function
export const initializeDatabase = async () => {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    return dataSource;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export default dataSource;

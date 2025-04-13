import { config } from 'dotenv';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import {
  BadgeEntity,
  CommentEntity,
  CommentVoteEntity,
  LeaderboardEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  TelegramUserConnectionEntity,
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
  UserTokenCallStreakEntity,
  WalletEntity,
} from './entities';

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

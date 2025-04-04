import { config } from 'dotenv';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CommentVoteEntity } from './entities/comment-vote.entity';
import { CommentEntity } from './entities/comment.entity';
import { TokenWatchlistEntity } from './entities/token-watchlist.entity';
import { TokenEntity } from './entities/token.entity';
import { TwitterUsernameHistoryEntity } from './entities/twitter-username-history.entity';
import { UserEntity } from './entities/user.entity';
import { WalletEntity } from './entities/wallet.entity';

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
  ],
  migrations: migrationsPath,
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: isProduction,
  synchronize: false,
  logging: isProduction ? ['error', 'warn'] : true, // Only log errors and warnings in production
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

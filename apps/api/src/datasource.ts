import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CommentVoteEntity } from './entities/comment-vote.entity';
import { CommentEntity } from './entities/comment.entity';
import { TokenEntity } from './entities/token.entity';

config(); // Load .env file

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [TokenEntity, CommentEntity, CommentVoteEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;

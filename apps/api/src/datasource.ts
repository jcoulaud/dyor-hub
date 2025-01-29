import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { CommentVoteEntity } from './entities/comment-vote.entity';
import { CommentEntity } from './entities/comment.entity';
import { TokenEntity } from './entities/token.entity';
import { UserEntity } from './entities/user.entity';

config(); // Load .env file

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [TokenEntity, CommentEntity, CommentVoteEntity, UserEntity],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'migrations.typeorm_migrations',
  migrationsRun: false,
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);

// // Add a hook to create migrations schema before any operation
// dataSource.initialize = async function () {
//   // Create a new connection for schema creation
//   const tempDataSource = new DataSource({
//     ...dataSourceOptions,
//   });

//   await tempDataSource.initialize();

//   try {
//     // Create migrations schema if it doesn't exist
//     await tempDataSource.query('CREATE SCHEMA IF NOT EXISTS migrations;');

//     // Set the search path to include both schemas in correct order
//     await tempDataSource.query('SET search_path TO public, migrations;');

//     // Create migrations table if it doesn't exist
//     await tempDataSource.query(`
//       CREATE TABLE IF NOT EXISTS migrations.typeorm_migrations (
//         id SERIAL PRIMARY KEY,
//         "timestamp" bigint NOT NULL,
//         name character varying NOT NULL
//       );
//     `);

//     await tempDataSource.destroy();

//     // Continue with normal initialization
//     const connection = await DataSource.prototype.initialize.call(this);

//     // Set the search path for the main connection
//     await connection.query('SET search_path TO public, migrations;');

//     return connection;
//   } catch (error) {
//     if (tempDataSource.isInitialized) {
//       await tempDataSource.destroy();
//     }
//     throw error;
//   }
// };

export default dataSource;

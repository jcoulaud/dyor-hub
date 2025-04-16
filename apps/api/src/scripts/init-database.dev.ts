import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../datasource';

async function initDatabase() {
  let connection: DataSource | null = null;

  try {
    // Create a new connection instance
    connection = new DataSource({
      ...dataSourceOptions,
      synchronize: false,
      migrationsRun: false,
    });

    // Initialize the connection
    await connection.initialize();
    console.log('Database connection initialized');

    // Check if migration table exists to determine if it's a fresh database
    const migrationTableExists = await connection.query(`SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = 'typeorm_migrations'
    )`);

    const exists =
      migrationTableExists.rows &&
      migrationTableExists.rows.length > 0 &&
      migrationTableExists.rows[0].exists;
    if (!exists) {
      console.log(
        'Fresh database detected, using synchronize to create tables',
      );
      await connection.destroy();
      connection = new DataSource({
        ...dataSourceOptions,
        synchronize: true,
        migrationsRun: false,
      });
      await connection.initialize();
      console.log('Tables synchronized');
    } else {
      console.log(
        'Database already has migration history, skipping synchronize',
      );
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (connection?.isInitialized) {
      await connection.destroy();
      console.log('Connection closed');
    }
    process.exit(0);
  }
}

initDatabase();

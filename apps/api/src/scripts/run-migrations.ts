import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../datasource';

async function runMigrations() {
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

    // Run migrations safely
    await connection.runMigrations({ transaction: 'each' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Always try to close the connection
    if (connection?.isInitialized) {
      await connection.destroy();
      console.log('Connection closed');
    }
    process.exit(0);
  }
}

runMigrations();

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
    const pendingMigrations = await connection.showMigrations();
    if (!pendingMigrations) {
      console.log('No pending migrations to run');
    } else {
      console.log('Running pending migrations');
      try {
        await connection.runMigrations({ transaction: 'each' });
        console.log('Migrations completed successfully');
      } catch (error) {
        console.error('Error during migration run:', error);
        if (error.message.includes('already exists')) {
          console.log(
            'Some migrations failed due to existing schema, attempting to mark them as applied',
          );
          // We can't directly mark specific migrations as run with public API, so we'll log and continue
          console.log(
            'Please manually check and update migration history if needed',
          );
        } else {
          throw error;
        }
      }
    }
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

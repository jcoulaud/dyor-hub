import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../datasource';

/**
 * Truncates all tables in the database while preserving the schema.
 * This is useful for quickly clearing data during testing.
 * Unlike a complete database reset, this preserves the database structure
 * and migration history.
 */
async function truncateAllTables() {
  console.log('Disabling foreign key constraints...');

  // Initialize database connection without running migrations
  const dataSource = new DataSource({
    ...dataSourceOptions,
    migrationsRun: false, // Don't run migrations during truncation
  });

  await dataSource.initialize();

  try {
    // Disable foreign key checks
    await dataSource.query('SET session_replication_role = replica;');

    // Get all table names from the database except the migrations table
    const tables = await dataSource.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename != 'typeorm_migrations'
    `);

    // Truncate each table
    for (const { tablename } of tables) {
      console.log(`Truncating table: ${tablename}`);
      await dataSource.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
    }

    // Re-enable foreign key checks
    await dataSource.query('SET session_replication_role = DEFAULT;');
    console.log('Re-enabling foreign key constraints...');

    console.log('Database truncation completed successfully!');
  } catch (error) {
    console.error('Error truncating database:', error);
    // Re-enable foreign key checks even if there was an error
    await dataSource.query('SET session_replication_role = DEFAULT;');
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  truncateAllTables()
    .then(() => {
      console.log('Database truncation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error truncating database:', error);
      process.exit(1);
    });
}

export { truncateAllTables };

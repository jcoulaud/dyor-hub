import { Pool } from 'pg';
import { config } from 'dotenv';

config(); // Load .env file

async function clearDatabase() {
  const dbName = process.env.POSTGRES_DB || 'dyor_hub_dev';
  // Connect directly to the target database to clear its contents
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/dyor_hub_dev';

  let pool;
  try {
    pool = new Pool({ connectionString });
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database', dbName);

    // Get all tables in the public schema
    const res = await client.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );

    if (res.rows.length > 0) {
      console.log(`Found ${res.rows.length} tables to clear`);
      // Truncate all tables
      for (const row of res.rows) {
        const tableName = row.table_name;
        try {
          await client.query(`TRUNCATE TABLE ${tableName} CASCADE`);
          console.log(`Cleared table: ${tableName}`);
        } catch (truncateError) {
          console.error(
            `Error truncating table ${tableName}:`,
            truncateError.message,
          );
        }
      }
      console.log('All tables cleared successfully');
    } else {
      console.log('No tables found to clear');
    }
    client.release();
  } catch (error) {
    console.error('Error clearing database contents:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('Connection pool closed');
    }
    // Do not exit with 0 here to allow subsequent commands to run
  }
}

clearDatabase();

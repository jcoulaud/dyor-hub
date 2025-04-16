import { Pool } from 'pg';
import { config } from 'dotenv';

config(); // Load .env file

async function createDatabase() {
  const dbName = process.env.POSTGRES_DB || 'dyor_hub_dev';
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/postgres';

  let pool;
  try {
    pool = new Pool({ connectionString });
    const client = await pool.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );
    if (res.rows.length > 0) {
      console.log(`Database ${dbName} already exists`);
    } else {
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created successfully`);
    }
    client.release();
  } catch (error) {
    console.error('Error creating database:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
      console.log('Connection pool closed');
    }
    process.exit(0);
  }
}

createDatabase();

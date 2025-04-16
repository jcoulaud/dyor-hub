import { initializeDatabase } from '../datasource';

async function main() {
  try {
    console.log('Initializing database...');

    // Set NODE_ENV to ensure correct paths are used
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }

    await initializeDatabase();
    console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();

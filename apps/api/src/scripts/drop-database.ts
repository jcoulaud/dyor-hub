import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../datasource';

async function dropDatabase() {
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

    // Drop and recreate schemas
    await connection.query('DROP SCHEMA IF EXISTS migrations CASCADE;');
    await connection.query('DROP SCHEMA IF EXISTS public CASCADE;');
    console.log('Schemas dropped');

    await connection.query('CREATE SCHEMA public;');
    await connection.query('CREATE SCHEMA migrations;');
    console.log('Schemas recreated');

    // Set basic permissions
    await connection.query('GRANT ALL ON SCHEMA public TO current_user;');
    await connection.query('GRANT ALL ON SCHEMA migrations TO current_user;');
    console.log('Permissions set');
  } catch (error) {
    console.error('Error dropping database:', error);
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

dropDatabase();

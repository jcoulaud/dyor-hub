import { exec } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { promisify } from 'util';
import { dataSourceOptions } from '../datasource';

const execAsync = promisify(exec);

async function resetDatabase() {
  try {
    console.log('🗑️  Dropping database...');
    await execAsync('pnpm db:drop');

    // Small delay to ensure connections are properly closed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('🧹 Clearing migrations...');
    await execAsync('pnpm migration:clear');

    // Ensure migrations directory exists
    const migrationsDir = join(process.cwd(), 'src', 'migrations');
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Initialize database with synchronize to create initial schema
    console.log('🔧 Creating initial schema...');
    const tempDataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: true,
      migrationsRun: false,
    });

    await tempDataSource.initialize();

    // Create migrations schema and set search path
    await tempDataSource.query('CREATE SCHEMA IF NOT EXISTS migrations;');
    await tempDataSource.query('SET search_path TO public, migrations;');

    // Drop all existing tables in public schema
    await tempDataSource.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    // Now synchronize to create tables
    await tempDataSource.synchronize(true);
    await tempDataSource.destroy();

    // Generate migration by comparing with the synchronized database
    console.log('✨ Generating migration from entities...');
    const result = await execAsync(
      'pnpm tsx ./node_modules/typeorm/cli.js migration:generate -d ./src/datasource.ts ./src/migrations/InitialMigration',
    );
    console.log(result.stdout);

    // Run the generated migration
    console.log('🚀 Running migrations...');
    await execAsync('pnpm migration:run');

    console.log('✅ Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Error during database reset:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('stdout' in error) {
        console.error('Command output:', (error as any).stdout);
      }
    }
    process.exit(1);
  }
}

resetDatabase();

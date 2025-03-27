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

    // Ensure migrations directory exists
    const migrationsDir = join(process.cwd(), 'src', 'migrations');
    if (!existsSync(migrationsDir)) {
      mkdirSync(migrationsDir, { recursive: true });
    }

    // Initialize database with migrations
    console.log('🔧 Running migrations...');
    const dataSource = new DataSource({
      ...dataSourceOptions,
      synchronize: false,
      migrationsRun: true,
    });

    await dataSource.initialize();
    await dataSource.destroy();

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

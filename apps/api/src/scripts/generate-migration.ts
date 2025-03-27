import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function generateMigration() {
  try {
    console.log('Generating migration...');
    const timestamp = new Date().getTime();
    const result = await execAsync(
      `pnpm tsx ./node_modules/typeorm/cli.js migration:generate -d ./src/datasource.ts ./src/migrations/Migration${timestamp}`,
    );
    console.log(result.stdout);
    console.log('Migration generated successfully!');
  } catch (error) {
    console.error('Error generating migration:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('stdout' in error) {
        console.error('Command output:', (error as any).stdout);
      }
    }
    process.exit(1);
  }
}

generateMigration(); 

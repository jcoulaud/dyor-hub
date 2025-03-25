import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';
import { dataSourceOptions } from '../datasource';

const dataSource = new DataSource(dataSourceOptions);

async function seedDatabase() {
  try {
    await dataSource.initialize();
    console.log('Database initialized, starting seed...');

    // Read and execute the SQL file
    const sqlFile = readFileSync(join(__dirname, 'dyor_hub_seed.sql'), 'utf8');
    
    // Split the SQL file into individual statements
    const statements = sqlFile
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        await dataSource.query(statement);
      } catch (error) {
        console.error(`Error executing statement: ${statement}`);
        console.error(error);
        throw error;
      }
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seedDatabase(); 

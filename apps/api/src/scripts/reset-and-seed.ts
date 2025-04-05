import { truncateAllTables } from './reset-db';
import { seedDatabase } from './seed-database';

/**
 * This script truncates all tables in the database and then seeds it with fresh data.
 * It assumes the schema is already set up correctly with migrations run separately.
 */
async function truncateAndSeedDatabase() {
  console.log('Starting database truncate and seed process...');

  try {
    // First truncate all tables (preserving the migration history)
    await truncateAllTables();
    console.log('Database truncation completed!');

    // Then seed the database with fresh data
    await seedDatabase();
    console.log('Database seeding completed!');

    console.log('Database truncate and seed process completed successfully!');
  } catch (error) {
    console.error('Error in truncate and seed process:', error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  truncateAndSeedDatabase()
    .then(() => {
      console.log('Database truncate and seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to truncate and seed database:', error);
      process.exit(1);
    });
}

export { truncateAndSeedDatabase };

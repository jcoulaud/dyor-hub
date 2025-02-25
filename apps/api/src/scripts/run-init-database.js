// This script is used to run the initialization script in production
// It's needed because we need to ensure the script is run with the correct NODE_ENV

// Set NODE_ENV to production if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Import and run the initialization script
// In the compiled output, the init-database.js file is in the dist/scripts directory
try {
  // First try to load from the same directory (for development)
  require('./init-database.js');
} catch (error) {
  try {
    // If that fails, try to load from the dist/scripts directory (for production)
    require('../../scripts/init-database.js');
  } catch (innerError) {
    console.error('Failed to load init-database.js:', innerError);
    process.exit(1);
  }
}

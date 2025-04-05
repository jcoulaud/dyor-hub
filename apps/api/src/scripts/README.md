# Database Management Scripts

This directory contains scripts for managing the database in the DYOR Hub API.

## Workflow

The typical database management workflow should follow these steps:

1. **Initialize Database**: Set up the database connection
2. **Run Migrations**: Apply any schema changes
3. **Seed Database**: Populate the database with test data

For development and testing, you can use the truncate-and-seed approach to quickly reset data while preserving the schema.

## Available Scripts

### `init-database.ts` - Initialize Database

Initializes the database connection using TypeORM. This is a basic script that ensures the database connection is working.

```bash
pnpm db:init
```

### `run-migrations.ts` - Run Migrations

Runs any pending TypeORM migrations to update the database schema.

```bash
pnpm migration:run
```

### `reset-db.ts` - Truncate All Tables

Truncates all tables in the database while preserving the schema and migration history. This is useful for quickly clearing data for testing purposes.

```bash
pnpm db:truncate
```

### `seed-database.ts` - Seed Database

Seeds the database with fake data for development and testing. Creates users, tokens, comments, votes, wallets, badges, activities, notifications, and more.

```bash
pnpm db:seed
```

### `reset-and-seed.ts` - Truncate and Seed

Combines both operations: truncates all tables and then seeds the database with fresh data.

```bash
pnpm db:truncate-and-seed
```

### `rebuild-database-schema.ts` - Rebuild Database Schema

Completely rebuilds the database schema by:

1. Dropping the database
2. Clearing migrations
3. Generating a new migration from the current entities
4. Running the migration to create all tables

Use this when schema changes have been made to entities.

```bash
pnpm db:rebuild-schema
```

### `drop-database.ts` - Drop Database

Drops the entire database. Use with caution!

## Usage Guidelines

- **For routine development and testing**:

  - Use `db:truncate-and-seed` to clear data and create fresh test data
  - This preserves your schema and migration history

- **After schema/entity changes**:

  1. Use `db:rebuild-schema` to completely rebuild the database schema, or
  2. Generate a new migration and run it with TypeORM migration commands

- **For production deployment**:
  1. Never use seeding or truncate scripts in production
  2. Only use migration scripts to manage the schema

## Notes

- All scripts handle foreign key constraints appropriately
- The seeder creates a large amount of test data with realistic relationships between entities
- You can configure the amount of test data by adjusting the constants at the top of the `seed-database.ts` file
- The truncate script preserves the TypeORM migration history so you don't need to re-run migrations

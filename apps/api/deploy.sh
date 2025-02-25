#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process..."

# Set NODE_ENV to production
export NODE_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build the application
echo "🔨 Building application..."
pnpm build

# Initialize database and run migrations
echo "🗃️ Running database migrations..."
pnpm migration:run

# Start the application
echo "🌟 Starting application..."
pnpm start:prod 
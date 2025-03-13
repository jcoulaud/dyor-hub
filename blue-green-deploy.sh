#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
GREEN_PORT_WEB=3200
BLUE_PORT_API=3101
GREEN_PORT_API=3201
NGINX_CONFIG="/etc/nginx/sites-available/dyor-hub"

# Determine which environment is currently active by checking Nginx config
if grep -q "proxy_pass http://127.0.0.1:$BLUE_PORT_WEB" $NGINX_CONFIG; then
  CURRENT_ENV="blue"
  NEW_ENV="green"
  CURRENT_PORT_WEB=$BLUE_PORT_WEB
  NEW_PORT_WEB=$GREEN_PORT_WEB
  CURRENT_PORT_API=$BLUE_PORT_API
  NEW_PORT_API=$GREEN_PORT_API
else
  CURRENT_ENV="green"
  NEW_ENV="blue"
  CURRENT_PORT_WEB=$GREEN_PORT_WEB
  NEW_PORT_WEB=$BLUE_PORT_WEB
  CURRENT_PORT_API=$GREEN_PORT_API
  NEW_PORT_API=$BLUE_PORT_API
fi

echo "Current environment is $CURRENT_ENV, deploying to $NEW_ENV"

# Perform cleanup before starting to free up resources
echo "Performing cleanup to free up resources..."
docker image prune -f
docker container prune -f
docker builder prune -f --filter until=24h

# Backup existing environment files
echo "Backing up existing environment files..."
BACKUP_DIR="/tmp/dyor-hub-env-backup"
mkdir -p $BACKUP_DIR/apps/api
mkdir -p $BACKUP_DIR/apps/web

if [ -d "$APP_DIR/apps/api" ] && [ -f "$APP_DIR/apps/api/.env" ]; then
  echo "Backing up API .env file"
  cp "$APP_DIR/apps/api/.env" "$BACKUP_DIR/apps/api/.env"
fi

if [ -d "$APP_DIR/apps/web" ] && [ -f "$APP_DIR/apps/web/.env" ]; then
  echo "Backing up Web .env file"
  cp "$APP_DIR/apps/web/.env" "$BACKUP_DIR/apps/web/.env"
fi

# Update the repository with depth 1 to minimize disk usage
echo "Updating the repository..."
cd $APP_DIR
git fetch --depth 1 origin main
git reset --hard origin/main

# Restore environment files
echo "Restoring environment files..."
mkdir -p apps/api
mkdir -p apps/web

if [ -f "$BACKUP_DIR/apps/api/.env" ]; then
  echo "Restoring API .env file"
  cp "$BACKUP_DIR/apps/api/.env" "apps/api/.env"
fi

if [ -f "$BACKUP_DIR/apps/web/.env" ]; then
  echo "Restoring Web .env file"
  cp "$BACKUP_DIR/apps/web/.env" "apps/web/.env"
fi

# Create docker-compose file for the new environment with resource limits
echo "Creating docker-compose.$NEW_ENV.yml file..."
cat > $APP_DIR/docker-compose.$NEW_ENV.yml << EOF
version: '3.8'

services:
  # PostgreSQL Database - shared between environments
  postgres:
    image: postgres:16-alpine
    container_name: dyor-hub-postgres
    restart: always
    env_file:
      - ./apps/api/.env
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - '127.0.0.1:5433:5432'
    networks:
      - dyor-hub-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U \${POSTGRES_USER:-postgres} -d \${POSTGRES_DB:-dyor_hub}']
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

  # Redis for session management - shared between environments
  redis:
    image: redis:7-alpine
    container_name: dyor-hub-redis
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    ports:
      - '127.0.0.1:6380:6379'
    networks:
      - dyor-hub-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '0.3'
          memory: 256M

  # NestJS API
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      args:
        - NODE_ENV=production
    container_name: dyor-hub-$NEW_ENV-api
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./apps/api/.env
    ports:
      - '127.0.0.1:$NEW_PORT_API:3001'
    networks:
      - dyor-hub-network
    deploy:
      resources:
        limits:
          cpus: '0.8'
          memory: 768M

  # Next.js Frontend
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        - NODE_ENV=production
    container_name: dyor-hub-$NEW_ENV-web
    restart: always
    depends_on:
      - api
    env_file:
      - ./apps/web/.env
    ports:
      - '127.0.0.1:$NEW_PORT_WEB:3000'
    networks:
      - dyor-hub-network
    deploy:
      resources:
        limits:
          cpus: '0.8'
          memory: 768M

networks:
  dyor-hub-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
EOF

# Build and start the new environment with optimized build
echo "Building and starting $NEW_ENV environment..."
cd $APP_DIR
DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker-compose -f docker-compose.$NEW_ENV.yml build --parallel 2
docker-compose -f docker-compose.$NEW_ENV.yml up -d

# Wait for new containers to be healthy
echo "Waiting for new containers to be ready..."
attempt=0
max_attempts=30
until $(curl --output /dev/null --silent --head --fail http://127.0.0.1:$NEW_PORT_WEB); do
    if [ ${attempt} -eq ${max_attempts} ]; then
        echo "New environment failed to start properly"
        exit 1
    fi
    printf '.'
    sleep 5
    attempt=$(($attempt+1))
done

echo "New environment is ready"

# Update Nginx to point to the new environment
echo "Updating Nginx configuration..."
sudo sed -i "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_WEB/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_WEB/g" $NGINX_CONFIG
sudo sed -i "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_API/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_API/g" $NGINX_CONFIG

# Test Nginx configuration and reload
echo "Testing and reloading Nginx..."
sudo nginx -t && sudo nginx -s reload

echo "Traffic switched to $NEW_ENV environment"

# Wait for in-flight requests to complete
echo "Waiting 5 minutes for in-flight requests to complete before stopping the old environment..."
sleep 300

# Stop the old environment
echo "Stopping old $CURRENT_ENV environment..."
if [ -f "$APP_DIR/docker-compose.$CURRENT_ENV.yml" ]; then
  cd $APP_DIR
  docker-compose -f docker-compose.$CURRENT_ENV.yml down
fi

# Final cleanup
echo "Performing final cleanup..."
docker image prune -f
docker container prune -f

echo "Deployment completed successfully!"
exit 0 
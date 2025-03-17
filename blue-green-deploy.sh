#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
GREEN_PORT_WEB=3200
BLUE_PORT_API=3101
GREEN_PORT_API=3201
NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"
FORCE_REBUILD=${FORCE_REBUILD:-false}
LOG_FILE="/tmp/deployment.log"

# Log function
log() {
  local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "$message"
  echo "$message" >> $LOG_FILE
}

# Start with a clean log file
echo "=== Starting new deployment $(date) ===" > $LOG_FILE

log "Starting deployment process"
log "Force rebuild: $FORCE_REBUILD"
log "Disk space before deployment:"
df -h / >> $LOG_FILE

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

# Diagnostic check: see if the current environment's containers exist
log "Checking if current ($CURRENT_ENV) environment containers exist:"

# Check for old-style container names without environment suffix (backward compatibility)
if ! docker ps -a | grep -q "dyor-hub-$CURRENT_ENV-web"; then
  if docker ps -a | grep -q "dyor-hub-web"; then
    log "WARNING: Found old-style container name 'dyor-hub-web' without environment suffix"
    # Rename old-style containers if they exist
    if [ "$CURRENT_ENV" = "blue" ]; then
      docker rename dyor-hub-web dyor-hub-blue-web 2>/dev/null || true
      log "Renamed dyor-hub-web to dyor-hub-blue-web"
    fi
  else
    log "WARNING: Current $CURRENT_ENV web container not found - this indicates a previous deployment issue"
  fi
else
  log "Current $CURRENT_ENV web container found"
fi

if ! docker ps -a | grep -q "dyor-hub-$CURRENT_ENV-api"; then
  if docker ps -a | grep -q "dyor-hub-api"; then
    log "WARNING: Found old-style container name 'dyor-hub-api' without environment suffix"
    # Rename old-style containers if they exist
    if [ "$CURRENT_ENV" = "blue" ]; then
      docker rename dyor-hub-api dyor-hub-blue-api 2>/dev/null || true
      log "Renamed dyor-hub-api to dyor-hub-blue-api"
    fi
  else
    log "WARNING: Current $CURRENT_ENV api container not found - this indicates a previous deployment issue"
  fi
else
  log "Current $CURRENT_ENV api container found"
fi

# If force rebuild is true, we will use the same environment but rebuild everything
if [ "$FORCE_REBUILD" = "true" ]; then
  NEW_ENV=$CURRENT_ENV
  log "Force rebuild enabled - will rebuild the current $CURRENT_ENV environment"
else
  log "Current environment is $CURRENT_ENV, deploying to $NEW_ENV"
fi

# Log the docker state before cleanup
log "Current Docker containers before cleanup:"
docker ps -a >> $LOG_FILE

# Perform cleanup before starting to free up resources
log "Performing cleanup to free up resources..."
# Only remove untagged images and stopped containers to avoid disrupting running services
docker image prune -f >> $LOG_FILE 2>&1
docker container prune -f >> $LOG_FILE 2>&1

# Backup existing environment files
log "Backing up existing environment files..."
BACKUP_DIR="/tmp/dyor-hub-env-backup"
mkdir -p $BACKUP_DIR/apps/api
mkdir -p $BACKUP_DIR/apps/web

if [ -d "$APP_DIR/apps/api" ] && [ -f "$APP_DIR/apps/api/.env" ]; then
  log "Backing up API .env file"
  cp "$APP_DIR/apps/api/.env" "$BACKUP_DIR/apps/api/.env"
else
  log "WARNING: API .env file not found!"
fi

if [ -d "$APP_DIR/apps/web" ] && [ -f "$APP_DIR/apps/web/.env" ]; then
  log "Backing up Web .env file"
  cp "$APP_DIR/apps/web/.env" "$BACKUP_DIR/apps/web/.env"
else
  log "WARNING: Web .env file not found!"
fi

# Update the repository
log "Updating the repository..."
cd $APP_DIR
git fetch --depth 1 origin main
git reset --hard origin/main

# Restore environment files
log "Restoring environment files..."
mkdir -p apps/api
mkdir -p apps/web

if [ -f "$BACKUP_DIR/apps/api/.env" ]; then
  log "Restoring API .env file"
  cp "$BACKUP_DIR/apps/api/.env" "apps/api/.env"
else
  log "ERROR: No API .env backup found! Deployment may fail."
fi

if [ -f "$BACKUP_DIR/apps/web/.env" ]; then
  log "Restoring Web .env file"
  cp "$BACKUP_DIR/apps/web/.env" "apps/web/.env"
else
  log "ERROR: No Web .env backup found! Deployment may fail."
fi

# Check if database variables exist
if [ -f "$APP_DIR/apps/api/.env" ]; then
  if ! grep -q "POSTGRES_USER" "$APP_DIR/apps/api/.env"; then
    log "WARNING: POSTGRES_USER not found in .env file. PostgreSQL container might fail."
  fi
  if ! grep -q "POSTGRES_PASSWORD" "$APP_DIR/apps/api/.env"; then
    log "WARNING: POSTGRES_PASSWORD not found in .env file. PostgreSQL container might fail."
  fi
  if ! grep -q "POSTGRES_DB" "$APP_DIR/apps/api/.env"; then
    log "WARNING: POSTGRES_DB not found in .env file. PostgreSQL container might fail."
  fi
else
  log "ERROR: No API .env file found. Deployment will likely fail."
fi

# Create docker-compose file for the new environment
log "Creating docker-compose.$NEW_ENV.yml file..."
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
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

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

  # NestJS API
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      args:
        - NODE_ENV=production
        - BUILD_VERSION=\$(date +%s)
    container_name: dyor-hub-$NEW_ENV-api
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    env_file:
      - ./apps/api/.env
    environment:
      - NODE_ENV=production
      - DEPLOY_ENV=$NEW_ENV
      - BUILD_TIMESTAMP=\$(date +%s)
    ports:
      - '127.0.0.1:$NEW_PORT_API:3001'
    networks:
      - dyor-hub-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

  # Next.js Frontend
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        - NODE_ENV=production
        - BUILD_VERSION=\$(date +%s)
    container_name: dyor-hub-$NEW_ENV-web
    restart: always
    depends_on:
      api:
        condition: service_healthy
    env_file:
      - ./apps/web/.env
    environment:
      - NODE_ENV=production
      - DEPLOY_ENV=$NEW_ENV
      - BUILD_TIMESTAMP=\$(date +%s)
    ports:
      - '127.0.0.1:$NEW_PORT_WEB:3000'
    networks:
      - dyor-hub-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s

networks:
  dyor-hub-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
EOF

# Build and start the new environment
log "Building and starting $NEW_ENV environment..."
cd $APP_DIR

# Stop and remove any existing containers from the new environment before building
if [ -f "docker-compose.$NEW_ENV.yml" ]; then
  log "Stopping existing $NEW_ENV containers if they exist..."
  docker-compose -f docker-compose.$NEW_ENV.yml down || true
fi

# Build the containers
log "Building containers..."
BUILD_OPTS=""
if [ "$FORCE_REBUILD" = "true" ]; then
  BUILD_OPTS="--no-cache --pull"
  log "Force rebuild enabled - using --no-cache and --pull options"
else
  BUILD_OPTS="--no-cache"
fi

log "Starting Docker build..."
DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker-compose -f docker-compose.$NEW_ENV.yml build $BUILD_OPTS 2>&1 | tee -a $LOG_FILE

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  log "ERROR: Docker build failed!"
  exit 1
fi

log "Starting new containers..."
docker-compose -f docker-compose.$NEW_ENV.yml up -d 2>&1 | tee -a $LOG_FILE

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  log "ERROR: Docker Compose up failed!"
  exit 1
fi

# Verify the new containers are running
log "Verifying new containers are running..."
sleep 10  # Give containers a moment to start

docker ps -a >> $LOG_FILE

if ! docker ps | grep -q "dyor-hub-$NEW_ENV-web"; then
  log "ERROR: New web container is not running!"
  log "Web container logs:"
  docker-compose -f docker-compose.$NEW_ENV.yml logs web | tee -a $LOG_FILE
  exit 1
fi

if ! docker ps | grep -q "dyor-hub-$NEW_ENV-api"; then
  log "ERROR: New API container is not running!"
  log "API container logs:"
  docker-compose -f docker-compose.$NEW_ENV.yml logs api | tee -a $LOG_FILE
  exit 1
fi

# Wait for new containers to be healthy
log "Waiting for new containers to be ready..."
attempt=0
max_attempts=30

log "Checking web service health..."
until $(curl --output /dev/null --silent --fail http://127.0.0.1:$NEW_PORT_WEB); do
    if [ ${attempt} -eq ${max_attempts} ]; then
        log "Web service failed to start properly"
        log "Web container logs:"
        docker-compose -f docker-compose.$NEW_ENV.yml logs web | tee -a $LOG_FILE
        exit 1
    fi
    log "Waiting for web service... (attempt $attempt/$max_attempts)"
    sleep 5
    attempt=$(($attempt+1))
done

log "Web service is healthy"

# Reset attempt counter for API health check
attempt=0
log "Checking API service health..."
until $(curl --output /dev/null --silent --fail http://127.0.0.1:$NEW_PORT_API/health); do
    if [ ${attempt} -eq ${max_attempts} ]; then
        log "API service failed to start properly"
        log "API container logs:"
        docker-compose -f docker-compose.$NEW_ENV.yml logs api | tee -a $LOG_FILE
        exit 1
    fi
    log "Waiting for API service... (attempt $attempt/$max_attempts)"
    sleep 5
    attempt=$(($attempt+1))
done

log "API service is healthy"

# Only update Nginx if we're switching environments
if [ "$FORCE_REBUILD" != "true" ] || [ "$CURRENT_ENV" != "$NEW_ENV" ]; then
  # Update Nginx to point to the new environment
  log "Updating Nginx configuration..."
  sudo sed -i.bak "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_WEB/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_WEB/g" $NGINX_CONFIG
  sudo sed -i.bak "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_API/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_API/g" $NGINX_CONFIG

  # Test Nginx configuration and reload
  log "Testing and reloading Nginx..."
  if ! sudo nginx -t 2>&1 | tee -a $LOG_FILE; then
    log "ERROR: Nginx configuration test failed! Restoring backup..."
    sudo cp $NGINX_CONFIG.bak $NGINX_CONFIG
    exit 1
  fi

  sudo nginx -s reload
  log "Traffic switched to $NEW_ENV environment"
else
  log "Keeping Nginx configuration the same since we're rebuilding the current environment"
fi

# Clear Nginx cache if it exists
if [ -d "/var/cache/nginx" ]; then
  log "Clearing Nginx cache..."
  sudo rm -rf /var/cache/nginx/*
fi

# Restart Nginx to ensure any in-memory cache is also cleared
log "Restarting Nginx to clear any in-memory cache..."
sudo systemctl restart nginx

# Wait for in-flight requests to complete
if [ "$FORCE_REBUILD" != "true" ] && [ "$CURRENT_ENV" != "$NEW_ENV" ]; then
  log "Waiting 1 minute for in-flight requests to complete before stopping the old environment..."
  sleep 60

  # Stop the old environment
  log "Stopping old $CURRENT_ENV environment..."
  if [ -f "$APP_DIR/docker-compose.$CURRENT_ENV.yml" ]; then
    cd $APP_DIR
    # CRITICAL FIX: The script was accidentally targeting NEW_ENV instead of CURRENT_ENV
    # Explicitly confirm we're stopping the correct environment
    log "Double-checking we're stopping the right environment containers (old: $CURRENT_ENV, new: $NEW_ENV)"
    
    # ONLY stop the specific containers for the old environment, not the new ones
    OLD_WEB="dyor-hub-${CURRENT_ENV}-web"
    OLD_API="dyor-hub-${CURRENT_ENV}-api"
    
    log "Stopping old containers: $OLD_WEB and $OLD_API"
    docker stop $OLD_WEB $OLD_API || true
    docker rm $OLD_WEB $OLD_API || true
    
    # Don't use 'docker-compose down' as it might stop shared resources or the wrong containers
  else
    log "No docker-compose file for old environment, skipping shutdown"
  fi
fi

# Final verification of running containers
log "Performing final verification of running containers..."
if ! docker ps | grep -q "dyor-hub-$NEW_ENV-web"; then
  log "ERROR: Web container is not running after deployment!"
  docker start dyor-hub-$NEW_ENV-web || true
  sleep 5
fi

if ! docker ps | grep -q "dyor-hub-$NEW_ENV-api"; then
  log "ERROR: API container is not running after deployment!"
  docker start dyor-hub-$NEW_ENV-api || true
  sleep 5
fi

# Final cleanup - IMPORTANT: only clean up dangling images, not all unused ones
log "Performing cautious final cleanup - ONLY dangling images..."
docker image prune -f --filter="dangling=true"
# Do NOT prune containers here, as it might stop our newly deployed containers

# Log final state
log "Current running containers:"
docker ps >> $LOG_FILE

log "Disk space after deployment:"
df -h / >> $LOG_FILE

log "Deployment completed successfully!"
exit 0 
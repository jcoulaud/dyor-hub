#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
GREEN_PORT_WEB=3200
BLUE_PORT_API=3101
GREEN_PORT_API=3201
NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"

# Simple logging
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1"
}

# Cleanup function for Docker resources
cleanup_docker_resources() {
  {
    # Redirect all cleanup logs to a separate file
    exec 1>>/var/log/dyor-hub-cleanup.log 2>&1
    
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Starting async cleanup of Docker resources..."
    
    # Wait a bit to ensure new deployment is stable
    sleep 300
    
    # Clean build cache older than 12h
    docker builder prune -f --filter until=12h --keep-storage=10GB
    
    # Remove dangling images and unused images older than 12h
    docker image prune -f
    docker image prune -a -f --filter "until=12h"
    
    # Remove unused volumes (not used by any container) older than 12h
    docker volume prune -f --filter "until=12h"
    
    # Clean old container logs but preserve recent ones
    find /var/lib/docker/containers/ -type f -name '*-json.log' -size +10M -exec truncate -s 10M {} \;
    
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Async cleanup completed"
  } &>/dev/null &  # Redirect all output to /dev/null and run in background
}

log "Starting blue-green deployment"

# Determine current active environment
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

log "Current: $CURRENT_ENV, New: $NEW_ENV"

# Backup and update code
cd $APP_DIR
mkdir -p /tmp/dyor-hub-backup/{apps/api,apps/web}
[ -f "./apps/api/.env" ] && cp "./apps/api/.env" "/tmp/dyor-hub-backup/apps/api/.env"
[ -f "./apps/web/.env" ] && cp "./apps/web/.env" "/tmp/dyor-hub-backup/apps/web/.env"
git fetch --depth 1 origin main
git reset --hard origin/main
mkdir -p apps/{api,web}
[ -f "/tmp/dyor-hub-backup/apps/api/.env" ] && cp "/tmp/dyor-hub-backup/apps/api/.env" "apps/api/.env"
[ -f "/tmp/dyor-hub-backup/apps/web/.env" ] && cp "/tmp/dyor-hub-backup/apps/web/.env" "apps/web/.env"

# Ensure PostgreSQL variables are exported for docker-compose
if [ -f "./apps/api/.env" ]; then
  export $(grep -E '^POSTGRES_(USER|PASSWORD|DB)=' ./apps/api/.env | xargs)
fi

# Create docker-compose override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  postgres:
    container_name: dyor-hub-postgres
    env_file:
      - ./apps/api/.env
    restart: always
  api:
    container_name: dyor-hub-$NEW_ENV-api
    ports: ['127.0.0.1:$NEW_PORT_API:3001']
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
  web:
    container_name: dyor-hub-$NEW_ENV-web
    ports: ['127.0.0.1:$NEW_PORT_WEB:3000']
    depends_on:
      api:
        condition: service_started
EOF

# Build and start new environment
log "Building $NEW_ENV environment"
# Use buildkit for optimization
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Check for changes that would require a rebuild
CHANGES_DETECTED=false
if [ "$FORCE_REBUILD" = "true" ]; then
  CHANGES_DETECTED=true
  log "Force rebuild requested"
else
  # Get the current and previous commit hashes
  CURRENT_COMMIT=$(git rev-parse HEAD)
  
  # Check if .env.last-deployed-commit exists
  if [ -f ".env.last-deployed-commit" ]; then
    LAST_DEPLOYED_COMMIT=$(cat .env.last-deployed-commit)
    
    if [ "$CURRENT_COMMIT" != "$LAST_DEPLOYED_COMMIT" ]; then
      CHANGES_DETECTED=true
      log "New commit detected: $CURRENT_COMMIT (previous: $LAST_DEPLOYED_COMMIT)"
    else
      log "No new commits detected"
    fi
  else
    # First deployment or file doesn't exist
    CHANGES_DETECTED=true
    log "First deployment or missing commit tracking file"
  fi
fi

# Only build images if changes detected or images don't exist
if [ "$CHANGES_DETECTED" = "true" ] || ! docker image inspect dyor-hub-api:latest >/dev/null 2>&1 || ! docker image inspect dyor-hub-web:latest >/dev/null 2>&1; then
  log "Building Docker images with cache optimizations"
  # Clean up old images to ensure we get a fresh build
  docker-compose build --no-cache --build-arg BUILDKIT_INLINE_CACHE=1
  
  # Save the current commit as the last deployed
  echo "$CURRENT_COMMIT" > .env.last-deployed-commit
  log "Docker images rebuilt successfully"
else
  log "Skipping image build, using existing images"
fi

log "Starting database services"
docker-compose up -d postgres redis
sleep 10
log "Starting $NEW_ENV services"
docker-compose up -d api web

# Wait for API service to become ready
log "Waiting for API service to become ready"
MAX_RETRIES=60
RETRY_COUNT=0
until curl -s "http://127.0.0.1:$NEW_PORT_API/health" | grep -q "ok" || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  log "Waiting for API to be available... $(( RETRY_COUNT + 1 ))/$MAX_RETRIES"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  log "WARNING: API health check timed out, proceeding anyway"
else
  log "API service is ready"
fi

# Wait for services to start
log "Waiting for all services to become ready"
sleep 10

# Switch traffic
log "Updating Nginx to point to $NEW_ENV environment"
sudo cp $NGINX_CONFIG "${NGINX_CONFIG}.bak"
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_WEB|http://127.0.0.1:$NEW_PORT_WEB|g" $NGINX_CONFIG
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_API|http://127.0.0.1:$NEW_PORT_API|g" $NGINX_CONFIG

# Test Nginx configuration quietly
log "Testing and reloading Nginx configuration"
sudo nginx -t -q
if [ $? -eq 0 ]; then
  sudo nginx -s reload -q
  log "Nginx configuration updated successfully"
  
  # Only run immediate cleanup if API check was successful (not timed out)
  if [ $RETRY_COUNT -ne $MAX_RETRIES ]; then
    log "Running immediate Docker builder cleanup"
    docker builder prune -f
    log "Docker builder cleanup completed"
  else
    log "Skipping immediate Docker builder cleanup as API health check timed out"
  fi
else
  log "ERROR: Nginx configuration test failed. Rolling back..."
  sudo cp "${NGINX_CONFIG}.bak" $NGINX_CONFIG
  exit 1
fi

# Wait for connections to drain
log "Waiting for connections to drain from old environment"
sleep 30

# Stop old environment - first check if containers exist
log "Stopping old $CURRENT_ENV environment"
for container in "dyor-hub-$CURRENT_ENV-web" "dyor-hub-$CURRENT_ENV-api"; do
  if docker ps -a | grep -q "$container"; then
    docker stop "$container" && docker rm "$container"
  fi
done

# Cleanup
docker image prune -f
rm docker-compose.override.yml
echo "$NEW_ENV" > ".env.active"

log "Deployment completed successfully"
cleanup_docker_resources  # Start cleanup in background
log "Deployment finished, cleanup will run in background" 

#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
GREEN_PORT_WEB=3200
BLUE_PORT_API=3101
GREEN_PORT_API=3201
NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"
GITHUB_REPO="jcoulaud/dyor-hub"

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

# Rollback function
rollback() {
  log "Starting rollback..."
  
  # Restore Nginx config
  if [ -f "${NGINX_CONFIG}.bak" ]; then
    sudo cp "${NGINX_CONFIG}.bak" $NGINX_CONFIG
    sudo nginx -s reload -q
  fi
  
  # Stop and remove new containers
  for container in "dyor-hub-$NEW_ENV-web" "dyor-hub-$NEW_ENV-api"; do
    if docker ps -a | grep -q "$container"; then
      docker stop "$container" && docker rm "$container"
    fi
  done
  
  # Cleanup
  rm -f docker-compose.$NEW_ENV.yml
  
  log "Rollback completed"
  exit 1
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

# Create environment-specific compose file
cat > docker-compose.$NEW_ENV.yml << EOF
version: '3.8'
services:
  postgres:
    container_name: dyor-hub-postgres
    env_file:
      - ./apps/api/.env
    restart: always
  redis:
    container_name: dyor-hub-redis
    restart: always
  api:
    image: ghcr.io/$GITHUB_REPO/api:latest
    container_name: dyor-hub-$NEW_ENV-api
    ports: ['127.0.0.1:$NEW_PORT_API:3001']
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
  web:
    image: ghcr.io/$GITHUB_REPO/web:latest
    container_name: dyor-hub-$NEW_ENV-web
    ports: ['127.0.0.1:$NEW_PORT_WEB:3000']
    depends_on:
      api:
        condition: service_started
EOF

# Pull latest images
log "Pulling latest images"
docker-compose -f docker-compose.$NEW_ENV.yml pull api web || {
  log "ERROR: Failed to pull images"
  rollback
}

# Start new environment
log "Starting $NEW_ENV environment"
docker-compose -f docker-compose.$NEW_ENV.yml up -d api web || {
  log "ERROR: Failed to start new environment"
  rollback
}

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
  log "ERROR: API health check failed"
  rollback
fi

log "API service is healthy"

# Wait for web service to become ready
log "Waiting for Web service to become ready"
MAX_RETRIES=30
RETRY_COUNT=0
until curl -s "http://127.0.0.1:$NEW_PORT_WEB" > /dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
  log "Waiting for Web to be available... $(( RETRY_COUNT + 1 ))/$MAX_RETRIES"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  log "ERROR: Web health check failed"
  rollback
fi

log "Web service is healthy"

# Switch traffic
log "Updating Nginx to point to $NEW_ENV environment"
sudo cp $NGINX_CONFIG "${NGINX_CONFIG}.bak"
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_WEB|http://127.0.0.1:$NEW_PORT_WEB|g" $NGINX_CONFIG
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_API|http://127.0.0.1:$NEW_PORT_API|g" $NGINX_CONFIG

# Test Nginx configuration
log "Testing Nginx configuration"
if ! sudo nginx -t -q; then
  log "ERROR: Nginx configuration test failed"
  rollback
fi

# Reload Nginx
log "Reloading Nginx"
sudo nginx -s reload -q

# Wait for connections to drain
log "Waiting for connections to drain from old environment"
sleep 30

# Stop old environment
log "Stopping old $CURRENT_ENV environment"
if [ -f "docker-compose.$CURRENT_ENV.yml" ]; then
  docker-compose -f docker-compose.$CURRENT_ENV.yml down
  rm docker-compose.$CURRENT_ENV.yml
fi

# Cleanup old images
log "Cleaning up old images"
docker image prune -f

echo "$NEW_ENV" > ".env.active"

log "Deployment completed successfully"
cleanup_docker_resources
log "Deployment finished, cleanup will run in background" 

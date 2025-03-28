#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
GREEN_PORT_WEB=3200
BLUE_PORT_API=3101
GREEN_PORT_API=3201
NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"
TEMP_DIR="$APP_DIR/temp/$DEPLOY_ID"

# Simple logging
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a /tmp/deployment.log
}

# Error handling
handle_error() {
  log "ERROR: $1"
  # Restore nginx config if it exists
  if [ -f "${NGINX_CONFIG}.bak" ]; then
    sudo cp "${NGINX_CONFIG}.bak" $NGINX_CONFIG
    sudo nginx -s reload -q
  fi
  # Cleanup temp directory
  rm -rf "$TEMP_DIR"
  exit 1
}

# Check prerequisites
check_prerequisites() {
  # Check if docker-compose is installed
  if ! command -v docker-compose &> /dev/null; then
    handle_error "docker-compose not found"
  fi

  # Check if nginx is installed
  if ! command -v nginx &> /dev/null; then
    handle_error "nginx not found"
  fi

  # Check if docker daemon is running
  if ! docker info &> /dev/null; then
    handle_error "Docker daemon not running"
  fi

  # Check if user has sudo rights
  if ! sudo -n true 2>/dev/null; then
    handle_error "User does not have sudo rights"
  fi

  # Check if redis service exists
  if ! docker-compose config | grep -q "redis:"; then
    handle_error "Redis service not found in docker-compose"
  fi
}

log "Starting blue-green deployment"

# Check prerequisites
check_prerequisites

# Check for required environment variables
if [ -z "$DEPLOY_ID" ]; then
  handle_error "DEPLOY_ID environment variable is required"
fi

# Check if temp directory exists
if [ ! -d "$TEMP_DIR" ]; then
  handle_error "Temp directory $TEMP_DIR not found"
fi

# Check if ports are available
check_port() {
  if lsof -i :$1 > /dev/null; then
    handle_error "Port $1 is already in use"
  fi
}

# Check if ports are in nginx config
check_nginx_ports() {
  if ! grep -q "proxy_pass http://127.0.0.1:$1" $NGINX_CONFIG; then
    handle_error "Port $1 not found in nginx config"
  fi
}

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

# Check if new ports are available
check_port $NEW_PORT_WEB
check_port $NEW_PORT_API

# Check if ports are in nginx config
check_nginx_ports $CURRENT_PORT_WEB
check_nginx_ports $CURRENT_PORT_API

# Backup current environment
cd $APP_DIR
mkdir -p /tmp/dyor-hub-backup/{apps/api,apps/web}
[ -f "./apps/api/.env" ] && cp "./apps/api/.env" "/tmp/dyor-hub-backup/apps/api/.env"
[ -f "./apps/web/.env" ] && cp "./apps/web/.env" "/tmp/dyor-hub-backup/apps/web/.env"

# Backup nginx config
sudo cp $NGINX_CONFIG "${NGINX_CONFIG}.bak"

# Copy new build from temp to new environment directory
log "Copying new build from temp directory"
mkdir -p "apps/$NEW_ENV/{api,web}"
cp -r "$TEMP_DIR/web/." "apps/$NEW_ENV/web/"
cp -r "$TEMP_DIR/api/." "apps/$NEW_ENV/api/"

# Validate copied files
if [ ! -d "apps/$NEW_ENV/web/.next" ] || [ ! -d "apps/$NEW_ENV/api/dist" ]; then
  handle_error "Build artifacts not found in new environment"
fi

# Restore environment files
[ -f "/tmp/dyor-hub-backup/apps/api/.env" ] && cp "/tmp/dyor-hub-backup/apps/api/.env" "apps/$NEW_ENV/api/.env"
[ -f "/tmp/dyor-hub-backup/apps/web/.env" ] && cp "/tmp/dyor-hub-backup/apps/web/.env" "apps/$NEW_ENV/web/.env"

# Validate environment variables
validate_env() {
  local env_file="$1"
  local required_vars=("$@")
  shift
  for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" "$env_file"; then
      handle_error "Required environment variable $var not found in $env_file"
    fi
  done
}

# Validate API environment variables
if [ -f "./apps/$NEW_ENV/api/.env" ]; then
  validate_env "./apps/$NEW_ENV/api/.env" "POSTGRES_USER" "POSTGRES_PASSWORD" "POSTGRES_DB" "DATABASE_HOST" "REDIS_HOST"
  export $(grep -E '^POSTGRES_(USER|PASSWORD|DB)=' "./apps/$NEW_ENV/api/.env" | xargs)
fi

# Create docker-compose override
cat > docker-compose.override.yml << EOF
version: '3.8'
services:
  postgres:
    container_name: dyor-hub-postgres
    env_file:
      - ./apps/$NEW_ENV/api/.env
    restart: always
  api:
    container_name: dyor-hub-$NEW_ENV-api
    image: node:20-alpine
    ports: ['127.0.0.1:$NEW_PORT_API:3001']
    volumes:
      - ./apps/$NEW_ENV/api:/app:ro
    working_dir: /app
    command: node dist/index.js
    environment:
      - DATABASE_HOST=postgres
      - REDIS_HOST=redis
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
  web:
    container_name: dyor-hub-$NEW_ENV-web
    image: node:20-alpine
    ports: ['127.0.0.1:$NEW_PORT_WEB:3000']
    volumes:
      - ./apps/$NEW_ENV/web:/app:ro
    working_dir: /app
    command: node server.js
    environment:
      - NODE_ENV=production
    depends_on:
      api:
        condition: service_started
EOF

# Start new environment
log "Starting database services"
if ! docker-compose up -d postgres redis; then
  handle_error "Failed to start database services"
fi
sleep 10

log "Starting $NEW_ENV services"
if ! docker-compose up -d api web; then
  handle_error "Failed to start new services"
fi

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
  handle_error "API health check timed out"
else
  log "API service is ready"
fi

# Wait for services to start
log "Waiting for all services to become ready"
sleep 10

# Switch traffic
log "Updating Nginx to point to $NEW_ENV environment"
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_WEB|http://127.0.0.1:$NEW_PORT_WEB|g" $NGINX_CONFIG
sudo sed -i "s|http://127.0.0.1:$CURRENT_PORT_API|http://127.0.0.1:$NEW_PORT_API|g" $NGINX_CONFIG

# Test Nginx configuration quietly
log "Testing and reloading Nginx configuration"
sudo nginx -t -q
if [ $? -eq 0 ]; then
  sudo nginx -s reload -q
  log "Nginx configuration updated successfully"
else
  handle_error "Nginx configuration test failed"
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

# Cleanup temp directory
rm -rf "$TEMP_DIR"

log "Deployment completed successfully" 

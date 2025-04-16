#!/bin/bash
set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
BLUE_PORT_WEB=3100
	@@ -13,7 +12,6 @@ NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1"
}

# Cleanup function for Docker resources
cleanup_docker_resources() {
  {
	@@ -45,24 +43,12 @@ cleanup_docker_resources() {
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
	@@ -73,7 +59,6 @@ git reset --hard origin/main
mkdir -p apps/{api,web}
[ -f "/tmp/dyor-hub-backup/apps/api/.env" ] && cp "/tmp/dyor-hub-backup/apps/api/.env" "apps/api/.env"
[ -f "/tmp/dyor-hub-backup/apps/web/.env" ] && cp "/tmp/dyor-hub-backup/apps/web/.env" "apps/web/.env"

# Ensure PostgreSQL variables are exported for docker-compose
if [ -f "./apps/api/.env" ]; then
  export $(grep -E '^POSTGRES_(USER|PASSWORD|DB)=' ./apps/api/.env | xargs)
	@@ -121,11 +106,11 @@ if [ "$FORCE_REBUILD" = "true" ]; then
else
  # Get the current and previous commit hashes
  CURRENT_COMMIT=$(git rev-parse HEAD)
  
  # Check if .env.last-deployed-commit exists
  if [ -f ".env.last-deployed-commit" ]; then
    LAST_DEPLOYED_COMMIT=$(cat .env.last-deployed-commit)
    
    if [ "$CURRENT_COMMIT" != "$LAST_DEPLOYED_COMMIT" ]; then
      CHANGES_DETECTED=true
      log "New commit detected: $CURRENT_COMMIT (previous: $LAST_DEPLOYED_COMMIT)"
	@@ -144,7 +129,7 @@ if [ "$CHANGES_DETECTED" = "true" ] || ! docker image inspect dyor-hub-api:lates
  log "Building Docker images with cache optimizations"
  # Clean up old images to ensure we get a fresh build
  docker-compose build --no-cache --build-arg BUILDKIT_INLINE_CACHE=1
  
  # Save the current commit as the last deployed
  echo "$CURRENT_COMMIT" > .env.last-deployed-commit
  log "Docker images rebuilt successfully"
	@@ -190,7 +175,7 @@ sudo nginx -t -q
if [ $? -eq 0 ]; then
  sudo nginx -s reload -q
  log "Nginx configuration updated successfully"
  
  # Only run immediate cleanup if API check was successful (not timed out)
  if [ $RETRY_COUNT -ne $MAX_RETRIES ]; then
    log "Running immediate Docker builder cleanup"
	@@ -224,4 +209,4 @@ echo "$NEW_ENV" > ".env.active"

log "Deployment completed successfully"
cleanup_docker_resources  # Start cleanup in background
log "Deployment finished, cleanup will run in background" 

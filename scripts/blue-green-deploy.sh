#!/bin/bash

# Exit on error
set -e

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Navigate to the application directory
cd "$APP_DIR" || {
    log "Failed to navigate to $APP_DIR"
    exit 1
}

# Verify we're in the correct directory
if [ ! -f "docker-compose.green.yml" ]; then
    log "docker-compose.green.yml not found in $APP_DIR"
    exit 1
fi

# Determine current and new environment by checking actual running containers
CURRENT_ENV=""
if docker ps --format '{{.Names}}' | grep -q 'blue'; then
    CURRENT_ENV="blue"
elif docker ps --format '{{.Names}}' | grep -q 'green'; then
    CURRENT_ENV="green"
fi

if [ -z "$CURRENT_ENV" ]; then
    # If no environment is running, start with blue
    NEW_ENV="blue"
else
    NEW_ENV=$([ "$CURRENT_ENV" = "blue" ] && echo "green" || echo "blue")
fi

log "Current environment is ${CURRENT_ENV:-none}, deploying to ${NEW_ENV}"

# Build and start the new environment
log "Building and starting ${NEW_ENV} environment..."
docker-compose -f docker-compose.${NEW_ENV}.yml build api web || {
    log "Failed to build ${NEW_ENV} environment"
    exit 1
}

# Start the new environment
log "Starting ${NEW_ENV} environment..."
docker-compose -f docker-compose.${NEW_ENV}.yml up -d || {
    log "Failed to start ${NEW_ENV} environment"
    exit 1
}

# Store the name of the environment we just started
STARTED_ENV=$NEW_ENV

# Verify containers are running
log "Verifying containers are running..."
docker-compose -f docker-compose.${NEW_ENV}.yml ps || {
    log "Failed to verify containers"
    exit 1
}

# Wait for the new environment to be healthy
log "Waiting for ${NEW_ENV} environment to be healthy..."
# Give containers time to start up
sleep 10

if [ "$NEW_ENV" = "blue" ]; then
    PORT=3101
else
    PORT=3201
fi

for i in {1..5}; do
    log "Health check attempt $i of 5..."
    if curl -s "http://127.0.0.1:${PORT}/health" > /dev/null; then
        log "${NEW_ENV} environment is healthy"
        break
    fi
    if [ $i -eq 5 ]; then
        log "Health check failed for ${NEW_ENV} environment after 5 attempts"
        log "Checking container status..."
        docker-compose -f docker-compose.${NEW_ENV}.yml ps
        exit 1
    fi
    sleep 2
done

# Update Nginx configuration to point to the new environment
log "Updating Nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-enabled/dyor-hub"

if [ "$NEW_ENV" = "blue" ]; then
    CURRENT_PORT_WEB=3200
    NEW_PORT_WEB=3100
    CURRENT_PORT_API=3201
    NEW_PORT_API=3101
else
    CURRENT_PORT_WEB=3100
    NEW_PORT_WEB=3200
    CURRENT_PORT_API=3101
    NEW_PORT_API=3201
fi

# Update web port
sudo sed -i "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_WEB/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_WEB/" $NGINX_CONFIG
# Update API port
sudo sed -i "s/proxy_pass http:\/\/127.0.0.1:$CURRENT_PORT_API/proxy_pass http:\/\/127.0.0.1:$NEW_PORT_API/" $NGINX_CONFIG

# Test and reload Nginx
log "Testing and reloading Nginx..."
sudo nginx -t && sudo /bin/systemctl reload nginx || {
    log "Nginx configuration failed"
    exit 1
}

# Stop the old environment after a grace period
log "Waiting 1 minute before stopping old environment..."
sleep 60

# Only try to stop the old environment if it exists and is different from what we just started
if [ -n "$CURRENT_ENV" ] && [ "$CURRENT_ENV" != "$STARTED_ENV" ]; then
    log "Stopping old environment (${CURRENT_ENV})..."
    docker-compose -f docker-compose.${CURRENT_ENV}.yml down || {
        log "Failed to stop old environment"
        exit 1
    }
else
    log "No old environment to stop"
fi

log "Deployment completed successfully" 
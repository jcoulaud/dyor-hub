#!/bin/bash
# Simple script to diagnose and fix deployment issues

set -e

# Configuration
APP_DIR="/var/www/dyor-hub"
LOG_FILE="/tmp/deployment-fix.log"

# Log function
log() {
  local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
  echo "$message"
  echo "$message" >> $LOG_FILE
}

# Start with a clean log file
echo "=== Starting deployment fix $(date) ===" > $LOG_FILE

log "Checking system status..."
log "Disk space:"
df -h / | tee -a $LOG_FILE

log "Docker status:"
docker info | grep "Containers\|Images\|Server Version" | tee -a $LOG_FILE

log "Current Docker containers:"
docker ps -a | tee -a $LOG_FILE

log "Docker disk usage:"
docker system df | tee -a $LOG_FILE

log "Checking Docker compose files..."
ls -la $APP_DIR/docker-compose.*.yml 2>/dev/null || echo "No docker-compose files found"

# Check Nginx configuration
log "Checking Nginx configuration..."
sudo nginx -t || {
  log "Nginx configuration issue detected!"
  log "Checking Nginx error logs:"
  sudo tail -n 50 /var/log/nginx/error.log | tee -a $LOG_FILE
}

# Check for running containers
log "Checking for running containers..."
if docker ps | grep -q "dyor-hub"; then
  log "DYOR Hub containers are running"
else
  log "No DYOR Hub containers are running!"
  
  # Check for stopped containers
  if docker ps -a | grep -q "dyor-hub"; then
    log "Found stopped DYOR Hub containers. Checking logs..."
    
    # Check which environment (blue/green) is configured in Nginx
    if grep -q "proxy_pass http://127.0.0.1:3100" /etc/nginx/sites-enabled/dyor-hub; then
      CURRENT_ENV="blue"
    else
      CURRENT_ENV="green"
    fi
    
    log "Current environment according to Nginx: $CURRENT_ENV"
    
    # Check container logs
    log "Web container logs:"
    docker logs dyor-hub-${CURRENT_ENV}-web 2>&1 | tail -n 100 | tee -a $LOG_FILE || log "No web container logs available"
    
    log "API container logs:"
    docker logs dyor-hub-${CURRENT_ENV}-api 2>&1 | tail -n 100 | tee -a $LOG_FILE || log "No API container logs available"
    
    # Try to restart the containers if they exist
    log "Attempting to restart containers..."
    if [ -f "$APP_DIR/docker-compose.$CURRENT_ENV.yml" ]; then
      cd $APP_DIR
      docker-compose -f docker-compose.$CURRENT_ENV.yml up -d || log "Failed to restart containers"
    else
      log "No docker-compose file found for the current environment"
    fi
  else
    log "No DYOR Hub containers found at all (not even stopped)"
  fi
fi

log "Checking Nginx proxy configuration..."
if grep -q "proxy_pass http://127.0.0.1:3100" /etc/nginx/sites-enabled/dyor-hub; then
  log "Nginx is configured to use blue environment (port 3100)"
  
  # Check if the corresponding port is actually being listened to
  if ss -tln | grep -q ":3100"; then
    log "Port 3100 is being listened to"
  else
    log "WARNING: Port 3100 is not being listened to!"
  fi
elif grep -q "proxy_pass http://127.0.0.1:3200" /etc/nginx/sites-enabled/dyor-hub; then
  log "Nginx is configured to use green environment (port 3200)"
  
  # Check if the corresponding port is actually being listened to
  if ss -tln | grep -q ":3200"; then
    log "Port 3200 is being listened to"
  else
    log "WARNING: Port 3200 is not being listened to!"
  fi
else
  log "Couldn't determine which environment Nginx is configured to use"
fi

log "Checking deployment logs..."
if [ -f "/tmp/deployment.log" ]; then
  log "Last 50 lines of deployment log:"
  tail -n 50 /tmp/deployment.log | tee -a $LOG_FILE
else
  log "No deployment log found"
fi

log "Done. Check $LOG_FILE for details."

# Prompt for action
echo ""
echo "Choose an action:"
echo "1) Run a forced rebuild of the current environment"
echo "2) Clear all Docker containers and images"
echo "3) Exit without further action"
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    echo "Running forced rebuild..."
    cd $APP_DIR
    FORCE_REBUILD=true bash blue-green-deploy.sh
    ;;
  2)
    echo "Clearing all Docker containers and images..."
    docker stop $(docker ps -a -q) 2>/dev/null || true
    docker rm $(docker ps -a -q) 2>/dev/null || true
    docker system prune -f
    echo "Done. You will need to manually deploy again."
    ;;
  *)
    echo "Exiting without further action."
    ;;
esac

exit 0 
#!/bin/bash

# Exit on error
set -e

# Configuration
DOMAIN="dyorhub.xyz"
EMAIL="hello@dyorhub.xyz"
APP_DIR="/var/www/dyor-hub"
CERTBOT_DIR="/var/www/certbot"
BACKUP_DIR="/var/www/backups"
LOG_FILE="/var/log/dyor-hub-deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print section header
section() {
  echo -e "\n${GREEN}==== $1 ====${NC}\n"
  echo "==== $1 ====" >> $LOG_FILE
}

# Print info message
info() {
  echo -e "${YELLOW}$1${NC}"
  echo "[INFO] $1" >> $LOG_FILE
}

# Print error message
error() {
  echo -e "${RED}ERROR: $1${NC}"
  echo "[ERROR] $1" >> $LOG_FILE
  exit 1
}

# Function to handle cleanup on error
cleanup() {
  if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed. See $LOG_FILE for details.${NC}"
    
    # Check if we need to restore from backup
    if [ -d "$BACKUP_DIR/latest" ]; then
      echo -e "${YELLOW}Restoring from backup...${NC}"
      cp -r $BACKUP_DIR/latest/.env* $APP_DIR/ 2>/dev/null || true
    fi
  fi
}

# Register the cleanup function to run on script exit
trap cleanup EXIT

# Start logging
mkdir -p $(dirname $LOG_FILE)
echo "=== Deployment started at $(date) ===" > $LOG_FILE

# Check if running as root
if [ "$(id -u)" -ne 0 ]; then
  error "This script must be run as root"
fi

section "Starting deployment for DYOR Hub"

# Create necessary directories
info "Creating necessary directories..."
mkdir -p $CERTBOT_DIR
mkdir -p /var/www/html
mkdir -p $BACKUP_DIR/$TIMESTAMP

# Backup current environment files
if [ -f "$APP_DIR/apps/api/.env" ]; then
  info "Backing up environment files..."
  cp $APP_DIR/apps/api/.env $BACKUP_DIR/$TIMESTAMP/api.env
  cp $APP_DIR/apps/web/.env $BACKUP_DIR/$TIMESTAMP/web.env
  
  # Create a symlink to the latest backup
  rm -rf $BACKUP_DIR/latest
  ln -sf $BACKUP_DIR/$TIMESTAMP $BACKUP_DIR/latest
fi

# Set up SSL with Let's Encrypt if not already set up
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  section "Setting up SSL with Let's Encrypt"
  
  info "Installing Certbot..."
  apt-get update
  apt-get install -y certbot python3-certbot-nginx
  
  info "Obtaining SSL certificate..."
  certbot --nginx -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN --non-interactive --agree-tos -m $EMAIL || error "Failed to obtain SSL certificate"
  
  info "Generating DH parameters..."
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
  
  info "Setting up auto-renewal..."
  echo "0 0,12 * * * root python -c 'import random; import time; time.sleep(random.random() * 3600)' && certbot renew -q" | tee -a /etc/crontab > /dev/null
fi

# Update environment variables
section "Configuring environment variables"
info "Updating environment variables..."
cd $APP_DIR

# Only update domain in environment files if they exist and don't already have the correct domain
if [ -f "apps/api/.env" ]; then
  # Only generate secrets if they don't exist
  if grep -q "generate_a_secure_jwt_secret_here" apps/api/.env; then
    info "Generating secure secrets..."
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    
    # Update API environment file with secure secrets
    sed -i "s/generate_a_secure_jwt_secret_here/$JWT_SECRET/g" apps/api/.env
    sed -i "s/generate_a_secure_session_secret_here/$SESSION_SECRET/g" apps/api/.env
    sed -i "s/your_secure_password_here/$DB_PASSWORD/g" apps/api/.env
  else
    info "Secrets already configured, skipping generation"
  fi
  
  # Update domain in environment files
  sed -i "s/yourdomain\.com/$DOMAIN/g" apps/api/.env
  sed -i "s/yourdomain\.com/$DOMAIN/g" apps/web/.env
else
  error "Environment files not found. Please create apps/api/.env and apps/web/.env first."
fi

# Ensure Docker network exists
section "Setting up Docker network"
if ! docker network inspect dyor-hub-network >/dev/null 2>&1; then
  info "Creating Docker network..."
  docker network create dyor-hub-network || error "Failed to create Docker network"
fi

# Build and start Docker containers
section "Building and starting Docker containers"

# Stop any running containers gracefully
if docker-compose ps | grep -q "dyor-hub"; then
  info "Stopping existing containers..."
  docker-compose down --remove-orphans || error "Failed to stop existing containers"
fi

# Check if images already exist and if we need to rebuild
REBUILD=false
if [ "$1" == "--rebuild" ]; then
  REBUILD=true
  info "Rebuild flag detected, forcing rebuild..."
elif ! docker image inspect dyor-hub-api >/dev/null 2>&1 || ! docker image inspect dyor-hub-web >/dev/null 2>&1; then
  REBUILD=true
  info "Images don't exist, building..."
fi

if [ "$REBUILD" = true ]; then
  info "Building Docker containers..."
  docker-compose build || error "Failed to build Docker containers"
  info "Starting Docker containers..."
  docker-compose up -d || error "Failed to start Docker containers"
else
  info "Using existing Docker images..."
  info "Starting Docker containers..."
  docker-compose up -d --no-build || error "Failed to start Docker containers"
fi

# Verify containers are running
sleep 5
if ! docker-compose ps | grep -q "Up"; then
  error "Containers failed to start properly"
fi

# Set up automatic updates
section "Setting up automatic updates"
info "Creating update script..."
cat > /var/www/update-dyor-hub.sh << 'EOF'
#!/bin/bash
set -e
LOG_FILE="/var/log/dyor-hub-update.log"
echo "=== Update started at $(date) ===" >> $LOG_FILE

cd /var/www/dyor-hub

# Backup before update
mkdir -p /var/www/backups/$(date +"%Y%m%d_%H%M%S")
cp apps/api/.env /var/www/backups/$(date +"%Y%m%d_%H%M%S")/api.env
cp apps/web/.env /var/www/backups/$(date +"%Y%m%d_%H%M%S")/web.env

# Pull latest changes
git pull >> $LOG_FILE 2>&1

# Restart containers
docker-compose down >> $LOG_FILE 2>&1
docker-compose up -d --build >> $LOG_FILE 2>&1

echo "=== Update completed at $(date) ===" >> $LOG_FILE
EOF

chmod +x /var/www/update-dyor-hub.sh

info "Setting up daily updates..."
(crontab -l 2>/dev/null | grep -v "update-dyor-hub.sh"; echo "0 3 * * * /var/www/update-dyor-hub.sh") | crontab -

info "Automatic daily updates configured."

section "Deployment completed successfully!"
info "Your application is now running at https://$DOMAIN"
info "API is accessible at https://api.$DOMAIN"
info "Deployment log saved to $LOG_FILE" 
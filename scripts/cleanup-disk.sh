#!/bin/bash
# cleanup-disk.sh - Aggressively cleans up disk space before deployments

set -e

echo "========== DISK SPACE CLEANUP SCRIPT =========="
echo "Current disk usage:"
df -h /

echo -e "\n========== REMOVING DOCKER RESOURCES =========="

# Remove all stopped containers
echo "Removing all stopped containers..."
docker container prune -f

# Remove all unused images (not just dangling ones)
echo "Removing all unused Docker images..."
docker image prune -a -f --filter "until=24h"

# Remove unused volumes
echo "Removing unused Docker volumes..."
docker volume prune -f

# Remove build cache
echo "Removing Docker build cache..."
docker builder prune -f

echo -e "\n========== CLEANING PACKAGE CACHES =========="

# Clean pnpm cache
if command -v pnpm &> /dev/null; then
    echo "Cleaning pnpm cache..."
    pnpm store prune
fi

# Clean npm cache
if command -v npm &> /dev/null; then
    echo "Cleaning npm cache..."
    npm cache clean --force
fi

# Clean yarn cache if available
if command -v yarn &> /dev/null; then
    echo "Cleaning yarn cache..."
    yarn cache clean
fi

echo -e "\n========== CLEANING TEMPORARY FILES =========="

# Clean /tmp directory of files older than 2 days
echo "Cleaning old temporary files..."
find /tmp -type f -mtime +2 -delete 2>/dev/null || true

# Clean log files
echo "Cleaning old log files..."
sudo find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.1" -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.2" -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.3" -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.old" -delete 2>/dev/null || true

# Clean apt cache
echo "Cleaning apt cache..."
sudo apt-get clean -y 2>/dev/null || true

echo -e "\n========== DISK CLEANUP COMPLETE =========="
echo "Disk usage after cleanup:"
df -h /

echo -e "\nNote: If disk space is still low, consider:"
echo "1. Increasing your disk size"
echo "2. Removing old deployment files in /var/www/dyor-hub"
echo "3. Setting up log rotation" 
# Build stage
FROM node:20-alpine AS builder

# Use tmpfs for npm/pnpm cache to save disk space
RUN mkdir -p /tmp/pnpm-store && \
    chmod 777 /tmp/pnpm-store

# Set environment variables to use tmpfs
ENV PNPM_HOME=/tmp/pnpm-store
ENV npm_config_cache=/tmp/npm-cache

# Create app directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy the source code
COPY . .

# Build the types package first
RUN cd packages/types && pnpm build

# Build the API
RUN cd apps/api && pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV production
# Configure Node.js memory settings
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Install production dependencies
RUN npm install -g pnpm && \
    pnpm install --prod --no-frozen-lockfile

# Expose the port
EXPOSE 3001

# Start the application
CMD ["sh", "-c", "cd apps/api && NODE_ENV=production node dist/scripts/init-database.js && node dist/main.js"] 
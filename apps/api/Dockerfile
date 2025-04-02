# Build stage
FROM node:20-alpine AS builder

# Set build cache settings
ENV BUILDKIT_INLINE_CACHE=1

# Install essential build dependencies including Python
RUN apk add --no-cache python3 make g++ linux-headers git

# Set Python path explicitly
ENV PYTHON=/usr/bin/python3

# Install pnpm
RUN npm install -g pnpm

# Create app directory and set workdir
WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/api/package.json ./apps/api/

# Install dependencies with efficient caching
RUN pnpm install --frozen-lockfile

# Copy only necessary files for building
COPY packages/types/ ./packages/types/
COPY apps/api/ ./apps/api/

# Build the types package first
RUN cd packages/types && pnpm build

# Build the API
RUN cd apps/api && pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV production
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PYTHON=/usr/bin/python3

# Copy only what's needed to run the application
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Install production dependencies only
RUN apk add --no-cache python3 make g++ linux-headers && \
    npm install -g pnpm && \
    PNPM_REGISTRY_DEFAULT_STRICTSSL=false PYTHON=/usr/bin/python3 NODE_OPTIONS=--openssl-legacy-provider pnpm install --prod --frozen-lockfile --ignore-scripts && \
    apk del make g++

# Expose the port
EXPOSE 3001

# Health check to validate the service is running properly
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:3001/health || exit 1

# Start the application
CMD ["sh", "-c", "cd apps/api && NODE_ENV=production node dist/scripts/init-database.js && node dist/main.js"] 
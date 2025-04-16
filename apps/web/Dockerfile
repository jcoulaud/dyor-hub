# Build stage
FROM node:22-alpine AS builder

# Set BuildKit cache settings
ENV BUILDKIT_INLINE_CACHE=1

# Install essential build dependencies including Python
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev git

# Set Python path explicitly to ensure node-gyp can find it
ENV PYTHON=/usr/bin/python3

# Create app directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Create configuration for native module builds
RUN echo "nodedir=/usr/local" > .npmrc && \
    echo "usb_binary_host_mirror=https://github.com/tessel/node-usb/releases/download/" >> .npmrc

# Copy package files for efficient dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

# Install dependencies with optimized caching
RUN pnpm install --frozen-lockfile

# Copy only necessary source files
COPY packages/types/ ./packages/types/
COPY apps/web/ ./apps/web/

# Build the types package first
RUN cd packages/types && pnpm build

# Build the web app with production optimization
RUN cd apps/web && NEXT_TELEMETRY_DISABLED=1 pnpm build

# Production stage
FROM node:22-alpine AS runner

# Install runtime dependencies for USB (needed for hardware wallets)
RUN apk add --no-cache eudev libusb python3

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV PYTHON=/usr/bin/python3

# Copy package management files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./

# Copy only the necessary built files
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/next.config.js ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Install only production dependencies
RUN apk add --no-cache python3 make g++ linux-headers && \
    npm install -g pnpm && \
    PNPM_REGISTRY_DEFAULT_STRICTSSL=false PYTHON=/usr/bin/python3 NODE_OPTIONS=--openssl-legacy-provider pnpm install --prod --frozen-lockfile --ignore-scripts && \
    apk del make g++

# Healthcheck to validate the service is running properly
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://localhost:3000/api/health || exit 1

# Expose the port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "cd apps/web && node_modules/.bin/next start"] 

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies including Python and USB related packages
# (use only eudev, not libudev-zero)
RUN apk add --no-cache python3 make g++ linux-headers eudev-dev libusb-dev

# Set Python path explicitly to ensure node-gyp can find it
ENV PYTHON=/usr/bin/python3

# Create app directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Create configuration for pre-built binaries where possible
RUN echo "nodedir=/usr/local\nusb_binary_host_mirror=https://github.com/tessel/node-usb/releases/download/" > .npmrc

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy the source code
COPY . .

# Build the types package first
RUN cd packages/types && pnpm build

# Build the web app
RUN cd apps/web && pnpm build

# Production stage
FROM node:20-alpine AS runner

# Install runtime dependencies for USB (needed for hardware wallets)
# (use only eudev, not libudev-zero)
RUN apk add --no-cache eudev libusb

WORKDIR /app

# Set environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/next.config.js ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Copy built node_modules from builder stage with working native modules
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

# Expose the port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "cd apps/web && node_modules/.bin/next start"] 
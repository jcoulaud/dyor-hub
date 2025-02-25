# Build stage
FROM node:20-alpine AS builder

# Create app directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

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
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/apps/web/next.config.js ./apps/web/
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Install production dependencies
RUN npm install -g pnpm && \
    pnpm install --prod --no-frozen-lockfile

# Expose the port
EXPOSE 3000

# Start the application
CMD ["sh", "-c", "cd apps/web && node_modules/.bin/next start"] 
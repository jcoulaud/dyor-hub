# Development Guide

This guide explains how to set up and run the DYOR Hub development environment.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/dyor-hub.git
cd dyor-hub

# One command setup and start
pnpm start
```

This will:

1. Install all dependencies
2. Set up environment files
3. Start all services via Docker

**Note**: When you reboot or restart the Docker environment, the database will be cleaned up and reset to its initial state due to the database clearing step in the initialization service defined in `docker-compose.yml`. If you need to persist data between restarts, you should comment out or modify the `pnpm run db:clear` command in the `init-service` section of `scripts/dev/docker-compose.yml`.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/) (comes with Docker Desktop)
- [Node.js](https://nodejs.org/) (v22 or higher)
- [pnpm](https://pnpm.io/installation) (v9.0.0 or higher)

## Development Environment Architecture

The development environment consists of:

- **PostgreSQL**: Database (port 5433)
- **Redis**: Session and cache (port 6380)
- **NestJS API**: Backend service (port 3101)
- **Next.js Web**: Frontend application (port 3100)

Everything is containerized with Docker for consistent development across all platforms. Hot reloading is enabled for both frontend and backend code.

## Docker Development Commands

| Command               | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| `pnpm start`          | One-command setup and start                                   |
| `pnpm setup`          | Set up environment files only                                 |
| `pnpm docker:up`      | Start Docker containers                                       |
| `pnpm docker:down`    | Stop Docker containers                                        |
| `pnpm docker:restart` | Restart Docker containers                                     |
| `pnpm docker`         | Direct access to docker-compose (e.g., `pnpm docker logs -f`) |

## Turborepo Development Commands

As a monorepo powered by Turborepo, you can run specific commands on individual packages:

```bash
# Run dev server for all packages
pnpm dev

# Run dev for specific packages
pnpm dev --filter=web
pnpm dev --filter=api

# Build all packages
pnpm build

# Lint all packages
pnpm lint
```

## Local HTTPS Setup (Required for some features)

To ensure secure cookie handling and WebSocket authentication function correctly during local development (mirroring production behavior), you **must** run both the frontend and backend servers over HTTPS.

**Why?** Modern browsers require secure connections (HTTPS) when using cookies with the `SameSite=None` attribute, which is necessary for cross-origin authentication. Our secure WebSocket authentication relies on this.

The development setup process will automatically check for the necessary certificates and guide you through setting them up if they're missing. The process involves:

1. **Install `mkcert`:** This tool simplifies creating locally trusted SSL certificates.

   - **macOS:** `brew install mkcert`
   - **Linux:** Use package manager or follow instructions at [mkcert GitHub](https://github.com/FiloSottile/mkcert)
   - **Windows:** `choco install mkcert` or `scoop install mkcert`

2. **Install Local CA:** Run this once per machine to make your system trust `mkcert`-generated certificates (might require admin password):

   ```bash
   mkcert -install
   ```

3. **Generate Certificates:** Navigate to the `secrets` directory and generate certificates:
   ```bash
   cd secrets
   mkcert localhost 127.0.0.1 ::1
   ```

Once these certificates are in place, the development environment will automatically use them for HTTPS connections.

**Note:** You'll access the development environment at these URLs:

- Web app: https://localhost:3000 (not 3100)
- API: https://localhost:3001 (not 3101)

These are the secure HTTPS ports that use the certificates you've generated. The non-HTTPS ports (3100 and 3101) remain available but shouldn't be used for development.

## Manual Setup (Without Docker)

If you prefer not to use Docker for development:

1. Install dependencies:

   - Node.js 20+
   - pnpm
   - PostgreSQL 16
   - Redis 7

2. Set up the environment:

```bash
# Install dependencies and setup environment
pnpm install
pnpm setup
```

3. Start the services in separate terminals:

```bash
# Terminal 1: Start the API
cd apps/api
pnpm run start:dev

# Terminal 2: Start the web app
cd apps/web
pnpm run dev
```

## Development Scripts

The development scripts are located in the `scripts/dev` directory:

- `index.js` - Main orchestration script for setting up the development environment
- `setup-env.js` - Sets up environment variables from example files
- `docker-up.js` - Starts Docker containers with enhanced error handling

These scripts provide user-friendly error messages to help diagnose and fix common issues.

## GitHub Codespaces

This project supports GitHub Codespaces for cloud-based development:

1. Click "Code" > "Open with Codespaces" on the GitHub repository page
2. The development environment will automatically be set up
3. All services will be started and ports forwarded

No local installation is required - the entire development environment runs in the browser.

## Native Module Dependencies

This project uses several native Node.js modules including the `usb` package for hardware wallet support. The Docker setup automatically installs the necessary dependencies:

- `linux-headers`: Required for kernel header files
- `eudev-dev`: Required for USB device detection
- `libusb-dev`: Required for USB communication
- `python3`, `make`, `g++`: Required for building native modules

If you're running the application outside of Docker and encounter build issues with USB-related modules, you'll need to install these dependencies on your system:

### MacOS

```bash
brew install libusb
```

### Ubuntu/Debian

```bash
sudo apt-get install libusb-1.0-0-dev libudev-dev
```

### Arch Linux

```bash
sudo pacman -S libusb
```

### Windows

Native USB modules can be more challenging on Windows. Consider using the Docker setup or Windows Subsystem for Linux (WSL).

## Troubleshooting

### Docker Performance Issues

If you're experiencing slow hot-reloading on macOS:

1. Increase Docker Desktop resources (CPU/Memory) in Preferences
2. Try using the VirtioFS file sharing implementation for newer macOS versions
3. Consider running only the database services in Docker and the Node.js apps directly on your host

### First Run Issues

The first time you run the Docker development environment, it will:

1. Download container images
2. Install build dependencies (Python, gcc, etc.)
3. Install pnpm globally inside containers
4. Install project dependencies
5. Build necessary native modules

This process can take 5-10 minutes. Subsequent runs will be much faster.

### Common Errors

- **Docker not running**: Make sure Docker Desktop is started
- **Database connection errors**: Check your `.env` files for correct credentials
  - Ensure POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB in your apps/api/.env file match the values in the docker-compose.yml file
  - The DATABASE_URL should point to "postgres:5432" (not localhost) when running in Docker
- **Port conflicts**: Ensure ports 3100, 3101, 5433, and 6380 are not in use by other applications
- **HTTPS certificate errors**: Verify certificates are generated correctly
- **Native module build errors**: If you see errors about Python or build tools, make sure the containers have access to them by checking the docker-compose.yml
- **`EBUSY: resource busy or locked, rmdir '/app/apps/api/dist'`**: This error occurs when NestJS can't remove the dist directory during build. The solution is to avoid mounting this directory as a volume in the docker-compose.yml file.

### Viewing Logs

To check the logs of a specific service:

```bash
# View API logs
docker logs dyor-hub-api-dev -f

# View web logs
docker logs dyor-hub-web-dev -f

# View database logs
docker logs dyor-hub-postgres-dev -f

# View Redis logs
docker logs dyor-hub-redis-dev -f
```

### Restarting Services

If you need to restart individual services:

```bash
# Restart API
docker restart dyor-hub-api-dev

# Restart web
docker restart dyor-hub-web-dev
```

### Clean Restart

If you need a completely fresh start (which will reset the database):

```bash
# Stop all containers and remove volumes
docker compose -f scripts/dev/docker-compose.yml down -v

# Start everything again
docker compose -f scripts/dev/docker-compose.yml up
```

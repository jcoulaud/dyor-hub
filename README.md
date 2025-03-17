# DYOR Hub

DYOR Hub (Do Your Own Research Hub) is a platform for discovering, discussing, and researching tokens in the cryptocurrency space.

## Architecture Overview

In production, the application uses the following architecture:

- Frontend: `dyorhub.xyz` (main domain)
- API: `api.dyorhub.xyz` (subdomain)

This separation provides better organization and security compared to using path-based API routing (`dyorhub.xyz/api`).

## Tech Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL
- **Authentication**: Twitter OAuth with session management
- **Session Storage**: Redis
- **Content Moderation**: Google Perspective API
- **Token Data**: Helius API and DexScreener
- **Monorepo Management**: Turborepo

## Requirements

- **Node.js**: v18.12.0 or higher (v20.18.1 recommended)
- **pnpm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v6 or higher

> **Note**: If you're using nvm, you can run `nvm use` to automatically use the correct Node.js version specified in the `.nvmrc` file.

## Project Structure

This monorepo includes the following packages/apps:

### Apps

- `apps/web`: Next.js frontend application
- `apps/api`: NestJS backend API

### Packages

- `packages/types`: Shared TypeScript types and interfaces
- `packages/config`: Shared configuration files
- `packages/ui`: Shared UI components

## Features

### Token Data Integration

The platform integrates with multiple data sources to provide comprehensive token information:

- **Helius API**: Fetches on-chain token metadata
- **DexScreener**: Provides market data and additional token information
- **IPFS**: Retrieves extended metadata when available

### Content Moderation

Comments are automatically moderated using:

- **Google Perspective API**: Detects toxic content and spam
- **Custom Filtering**: Additional rules for short comments and URLs

### User Interaction

- **Comment System**: Threaded discussions with voting
- **Vote System**: Upvote/downvote functionality for comments
- **Moderation Tools**: Comment removal for admins and comment owners

## Development

### Setup

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `apps/api` and `apps/web` directories
   - Configure the environment variables as needed

### Running Locally

To run the entire project in development mode:

```
pnpm dev
```

To run only specific apps:

```
pnpm dev --filter=web  # Run only the web app
pnpm dev --filter=api  # Run only the API
```

### Building for Production

```
pnpm build
```

## Production Deployment

### Environment Configuration

For production deployment, ensure the following environment variables are set correctly:

#### API Server (.env)

```
# Environment
NODE_ENV=production
PORT=3001

# API Configuration
USE_API_SUBDOMAIN=true

# Database Configuration
DATABASE_URL=postgres://dyor_hub_user:your_secure_password_here@postgres:5432/dyor_hub

# Redis Configuration
REDIS_URL=redis://username:password@your-redis-host:6379

# Twitter Auth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_CALLBACK_URL=https://api.dyorhub.xyz/auth/twitter/callback

# Auth & Security
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h
SESSION_SECRET=your_secure_session_secret

# CORS & Cookies
ALLOWED_ORIGINS=https://dyorhub.xyz,https://www.dyorhub.xyz
ADDITIONAL_ALLOWED_ORIGINS=
COOKIE_DOMAIN=.dyorhub.xyz  # Note the leading dot to allow sharing across subdomains
CLIENT_URL=https://dyorhub.xyz

# External APIs
HELIUS_API_KEY=your_helius_api_key
PERSPECTIVE_API_KEY=your_perspective_api_key
```

#### Frontend (.env)

```
# Environment
NODE_ENV=production

# URL Configuration
NEXT_PUBLIC_URL=https://dyorhub.xyz
NEXT_PUBLIC_API_URL=https://api.dyorhub.xyz

# Authentication
NEXT_PUBLIC_COOKIE_DOMAIN=.dyorhub.xyz
```

### DNS Configuration

Ensure you have the following DNS records set up:

1. `dyorhub.xyz` - Points to your frontend server
2. `api.dyorhub.xyz` - Points to your API server

### Session Cookie Configuration

For Twitter OAuth authentication to work correctly across domains:

1. **Cookie Domain**: Always use a leading dot (e.g., `.dyorhub.xyz`) in production to allow cookies to be shared between the main domain and subdomains.

2. **Session Secret**: Use a strong, random value for `SESSION_SECRET`. You can generate one with:

   ```
   openssl rand -hex 32
   ```

3. **Cookie Settings**: The application automatically configures cookies with:

   - `secure: true` in production (requires HTTPS)
   - `sameSite: 'none'` in production (allows cross-domain cookies)
   - `httpOnly: true` (prevents JavaScript access)

4. **Redis Persistence**: Ensure Redis is properly configured and accessible, as it stores session data.

## Troubleshooting

### Common Issues

1. **Authentication Redirects**: If authentication redirects are not working correctly, ensure:

   - `TWITTER_CALLBACK_URL` is set to the API subdomain without the `/api` prefix
   - `COOKIE_DOMAIN` is set to `.dyorhub.xyz` (with the leading dot)
   - Both domains have proper SSL certificates

2. **CORS Issues**: If experiencing CORS issues:

   - Ensure `ALLOWED_ORIGINS` includes the frontend domain
   - Check that cookies are being properly set with the correct domain

3. **Cookie Sharing**: For cookies to be shared between domains:

   - Use `.dyorhub.xyz` as the cookie domain
   - Ensure both sites use HTTPS
   - Set `sameSite: 'none'` and `secure: true` in cookie options

4. **Session Issues**: If sessions are not persisting between requests:

   - Check Redis connectivity
   - Verify cookie settings in browser developer tools
   - Ensure the session cookie is being set with the correct domain
   - Check for any browser privacy features that might be blocking cookies

5. **Content Moderation**: If content moderation is not working:

   - Verify your `PERSPECTIVE_API_KEY` is valid and active
   - Check API quotas and limits
   - Review logs for any API errors

6. **Token Data**: If token data is incomplete or missing:
   - Verify your `HELIUS_API_KEY` is valid
   - Check if the token exists on-chain
   - Ensure proper network connectivity to external APIs

## Contributing

I welcome contributions to DYOR Hub! Please read my [Contributing Guide](CONTRIBUTING.md) for details on my code of conduct and the process for submitting pull requests.

## License

DYOR Hub is open-sourced software licensed under the [MIT license](LICENSE).

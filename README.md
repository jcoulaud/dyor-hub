# DYOR hub

DYOR hub (Do Your Own Research Hub) is a platform for discovering, discussing, and researching tokens in the cryptocurrency space.

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

### Admin Notifications

- **Telegram Notifications**: Receive alerts when new comments are posted
  - Optional integration - requires Telegram bot token and chat ID
  - See the [Admin Notifications](#admin-notifications-1) section for setup instructions

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
   ```bash
   # Copy development environment files
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

### Running Locally

1. Start everything (database, API, and frontend):

   ```bash
   pnpm dev
   ```

   This will:

   - Start PostgreSQL and Redis in Docker if not running
   - Start the API server (port 3001)
   - Start the frontend (port 3000)

2. Seed the database with initial data:

   ```bash
   pnpm db:seed
   ```

3. Stop all services:
   ```bash
   pnpm stop
   ```

### Development Environment Variables

For local development, refer to the `.env.example` files in both the API and web applications. These files contain all the necessary environment variables with appropriate default values for development.

## Building for Production

```
pnpm build
```

## Production Deployment

### Environment Configuration

For production deployment, configure your environment variables by using the `.env.example` files as templates. Make sure to update the following key areas:

1. Set `NODE_ENV=production`
2. Enable API subdomain with `USE_API_SUBDOMAIN=true`
3. Update all URLs to use your production domains
4. Set strong, secure values for all secrets
5. Configure proper CORS and cookie settings for cross-domain auth
6. Add valid API keys for external services

Refer to the production notes in `apps/api/.env.example` for specific guidance on production settings.

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

## Admin Notifications

### Telegram Notifications Setup

The application can send notifications to a Telegram channel when new comments are posted. This feature is optional and requires:

1. **Create a Telegram Bot**:

   - Contact [@BotFather](https://t.me/botfather) on Telegram
   - Send the command `/newbot` and follow the instructions
   - Save the API token you receive

2. **Create a Telegram Channel**:

   - Create a channel for admin notifications
   - Add your bot as an administrator

3. **Get the Chat ID**:

   - For a channel: Send a message and visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - The chat ID for a channel typically starts with `-100`

4. **Configure Environment Variables**:
   - Add the Telegram bot token and chat ID to your API server's `.env` file (see `apps/api/.env.example`)

Once configured, you'll receive notifications with user info, token address, comment content, and a direct link to view the comment.

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

I welcome contributions to DYOR hub! Please read my [Contributing Guide](CONTRIBUTING.md) for details on my code of conduct and the process for submitting pull requests.

## Donations

If you find DYOR hub useful and would like to support its development, you can send donations to my Solana wallet:

```
AGAuBEwae93RJaocTE43mvYz72Ay4cqWzc28RNa1XXMi
```

Thank you for your support!

## License

DYOR hub is open-sourced software licensed under the [MIT license](LICENSE).

# 🌍 Production Deployment Guide

This guide provides detailed instructions for deploying DYOR Hub to a production environment.

## Environment Configuration

For production deployment, ensure the following environment variables are set correctly:

### API Server (.env)

```
# Environment
NODE_ENV=production
PORT=3001

# API Configuration
USE_API_SUBDOMAIN=true
DEFAULT_APP_URL=https://dyorhub.xyz

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

# Admin Notifications (Optional)
TELEGRAM_ADMIN_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_CHAT_ID=your_chat_id_here
```

### Frontend (.env)

```
# Environment
NODE_ENV=production

# URL Configuration
NEXT_PUBLIC_URL=https://dyorhub.xyz
NEXT_PUBLIC_API_URL=https://api.dyorhub.xyz

# Authentication
NEXT_PUBLIC_COOKIE_DOMAIN=.dyorhub.xyz
```

## DNS Configuration

Ensure you have the following DNS records set up:

1. `dyorhub.xyz` - Points to your frontend server
2. `api.dyorhub.xyz` - Points to your API server

## Session Cookie Configuration

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
   - Add the following to your API server's `.env` file:
     ```
     TELEGRAM_ADMIN_BOT_TOKEN=your_bot_token_here
     TELEGRAM_ADMIN_CHAT_ID=your_chat_id_here
     ```

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

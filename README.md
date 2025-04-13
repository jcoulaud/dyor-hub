# 🌟 DYOR Hub

**DYOR Hub (Do Your Own Research Hub)** is a premier platform for discovering, discussing, and researching tokens in the cryptocurrency space.

## 🛠 Architecture Overview

In production, the application uses the following architecture:

- **Frontend**: `dyorhub.xyz` (main domain)
- **API**: `api.dyorhub.xyz` (subdomain)

This separation provides better organization and security compared to using path-based API routing (`dyorhub.xyz/api`).

## 🛠 Tech Stack

- **Frontend**: Next.js with TypeScript
- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL
- **Authentication**: Twitter OAuth with session management
- **Session Storage**: Redis
- **Content Moderation**: Google Perspective API
- **Token Data**: Helius API and DexScreener
- **Monorepo Management**: Turborepo

## 📋 Requirements

- **Node.js**: v22 or higher
- **pnpm**: v9.0.0 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v6 or higher

> **Note**: If you're using nvm, you can run `nvm use` to automatically use the correct Node.js version specified in the `.nvmrc` file.

## 📂 Project Structure

This monorepo includes the following packages/apps:

### Apps

- `apps/web`: Next.js frontend application
- `apps/api`: NestJS backend API

### Packages

- `packages/types`: Shared TypeScript types and interfaces
- `packages/config`: Shared configuration files
- `packages/ui`: Shared UI components

## ✨ Features

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

## 🚀 Development

Getting started with development is simple. For detailed instructions, environment setup, and available commands, see our [Development Guide](./DEVELOPMENT.md).

## 🌍 Production Deployment

For instructions on deploying DYOR Hub to production, including environment configuration and DNS setup, see our [Production Deployment Guide](./PRODUCTION.md).

## 🤝 Contributing

I welcome contributions to DYOR Hub! Please read my [Contributing Guide](CONTRIBUTING.md) for details on my code of conduct and the process for submitting pull requests.

## 💰 Donations

If you find DYOR Hub useful and would like to support its development, you can send donations to my Solana wallet:

```
AGAuBEwae93RJaocTE43mvYz72Ay4cqWzc28RNa1XXMi
```

Thank you for your support!

## 📜 License

DYOR Hub is open-sourced software licensed under the [MIT license](LICENSE).

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image configuration using remotePatterns (recommended approach)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
        pathname: '**',
      },
    ],
  },

  // Configure experimental features
  experimental: {
    serverActions: {
      enabled: true,
    },
  },

  // Environment variables that will be available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Configure async rewrites for API proxy if needed
  async rewrites() {
    // Only set up rewrites for development environment
    if (process.env.NODE_ENV === 'development') {
      // Default to localhost:3001 if NEXT_PUBLIC_API_URL is not set
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Remove any trailing /api from the API URL for cleaner destination URLs
      const baseApiUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

      console.log(`Setting up API rewrites for development: /api/* -> ${baseApiUrl}/api/*`);

      return [
        // Proxy /api/* requests to the API server
        {
          source: '/api/:path*',
          destination: `${baseApiUrl}/api/:path*`,
        },
      ];
    }

    // Check if we're using an API subdomain in production
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const isApiSubdomain = apiUrl && apiUrl.includes('://api.');

    if (isApiSubdomain) {
      console.log('Using API subdomain in production, no rewrites needed');
    } else {
      console.log('Not using API subdomain, but in production so no rewrites needed');
    }

    // In production with api.domain, we don't need rewrites
    return [];
  },
};

module.exports = nextConfig;

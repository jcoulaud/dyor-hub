/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
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

      return [
        // Proxy /api/* requests to the API server
        {
          source: '/api/:path*',
          destination: `${baseApiUrl}/api/:path*`,
        },
      ];
    }

    // In production with api.domain, we don't need rewrites
    return [];
  },
};

module.exports = nextConfig;

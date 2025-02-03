/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ipfs.io', 'arweave.net'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

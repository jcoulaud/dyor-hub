/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ipfs.io'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

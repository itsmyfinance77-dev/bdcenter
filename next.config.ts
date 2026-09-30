import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverActions: {
      // Form uploads are capped at 10 MB in src/modules/files; leave room for the other fields.
      bodySizeLimit: '11mb',
    },
  },
};

export default nextConfig;

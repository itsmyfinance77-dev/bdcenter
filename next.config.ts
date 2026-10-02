import path from 'node:path';
import type { NextConfig } from 'next';
import { servedOverHttps } from './src/lib/https';

const isDev = process.env.NODE_ENV !== 'production';
// False for dev and for the plain-HTTP preview build (see src/lib/https.ts).
const https = servedOverHttps();

/**
 * Baseline Content-Security-Policy. Next.js injects inline bootstrap scripts,
 * so scripts allow 'unsafe-inline' (a nonce-based policy would need every page
 * rendered dynamically); the rest is locked to this origin. Dev adds eval and
 * websockets for fast refresh.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(https ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Only honored over HTTPS; left out of dev and the plain-HTTP preview.
  ...(https
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Docker image sets NEXT_STANDALONE=1. On Windows a standalone build
  // needs symlink rights, so local builds skip it (see docs/HANDOFF.md).
  output: process.env.NEXT_STANDALONE === '1' ? 'standalone' : undefined,
  // The LAN preview builds into its own folder so it never clobbers the dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Keep file tracing inside the project; otherwise it can wander into
  // unreadable folders elsewhere on the machine.
  outputFileTracingRoot: path.resolve('.'),
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Form uploads are capped at 10 MB in src/modules/files; leave room for the other fields.
      bodySizeLimit: '11mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

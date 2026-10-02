/**
 * Production build of the site served over plain HTTP on every network
 * interface, for viewing it from the local network or a public IP while there
 * is no domain/HTTPS yet.
 *
 *   npm run preview:build    build into .next-preview (the dev server's .next is untouched)
 *   npm run preview          serve it on 0.0.0.0:3020 (PREVIEW_PORT to change)
 *
 * INSECURE_HTTP_PREVIEW=1 drops the HTTPS-only settings (Secure cookies,
 * HSTS, upgrade-insecure-requests); see src/lib/https.ts. Not for the real
 * deployment, which runs behind HTTPS (Docker setup).
 */
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

const command = process.argv[2];
if (command !== 'build' && command !== 'start') {
  console.error('Usage: node scripts/preview.mjs <build|start>');
  process.exit(1);
}

const port = process.env.PREVIEW_PORT || '3020';
const env = {
  ...process.env,
  NODE_ENV: 'production',
  INSECURE_HTTP_PREVIEW: '1',
  NEXT_DIST_DIR: '.next-preview',
};
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const args = command === 'build' ? ['build'] : ['start', '-H', '0.0.0.0', '-p', port];

if (command === 'start') {
  const addresses = Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
    .map((a) => `  http://${a.address}:${port}`);
  console.log(`Preview over plain HTTP (no HTTPS) on port ${port}:`);
  console.log([`  http://localhost:${port}`, ...addresses].join('\n'));
  console.log("From outside: forward a router port to this computer's LAN address and port.");
}

const child = spawn(process.execPath, [nextBin, ...args], { env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));

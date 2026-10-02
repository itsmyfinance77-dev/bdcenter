/**
 * Starts everything the browser tests (e2e/, `npm run test:e2e`) need, then
 * keeps running until Playwright stops it:
 *
 * 1. the database `bdcenter_e2e` (in the dev PostgreSQL container, so the dev
 *    data is never touched): created if missing and migrated, never reset —
 *    each run uses its own names (RUN_ID) instead of wiping old rows,
 * 2. a test admin for this run, with a generated password,
 * 3. a fake Kavenegar API that records SMS instead of sending them (tests read
 *    sign-in codes from GET /outbox),
 * 4. a production build of the site (in .next-e2e) served on 127.0.0.1:3030.
 *
 * Secrets and the admin login are generated per run and written to
 * .tmp-build/e2e-state.json (git-ignored) for the tests. E2E_REUSE_BUILD=1
 * skips the build when .next-e2e already exists.
 */
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

export const E2E_PORT = 3030;
export const SMS_PORT = 3031;

const root = fileURLToPath(new URL('..', import.meta.url));
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://bdcenter:bdcenter@127.0.0.1:5434/bdcenter_e2e?schema=public';
const siteUrl = `http://127.0.0.1:${E2E_PORT}`;
const runId = Date.now().toString(36);
const admin = {
  email: `e2e-admin-${runId}@bdcenter.test`,
  password: `e2e-${randomBytes(12).toString('hex')}`,
};

const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  DATABASE_URL: databaseUrl,
  // Plain HTTP on localhost: no Secure cookies, no HSTS (src/lib/https.ts).
  INSECURE_HTTP_PREVIEW: '1',
  NEXT_DIST_DIR: '.next-e2e',
  NEXT_PUBLIC_SITE_URL: siteUrl,
  SESSION_SECRET: randomBytes(48).toString('base64'),
  OTP_SECRET: randomBytes(48).toString('base64'),
  DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  STORAGE_DIR: '.tmp-build/e2e-storage',
  SMS_PROVIDER: 'kavenegar',
  KAVENEGAR_API_KEY: 'e2e',
  KAVENEGAR_API_URL: `http://127.0.0.1:${SMS_PORT}`,
  KAVENEGAR_OTP_TEMPLATE: '',
  SMTP_URL: '',
  ERROR_ALERT_EMAIL: '',
  BACKUP_DIR: '',
  // Rate limits key on this header, which every test request sets to a
  // per-run value (playwright.config.ts): repeated runs do not hit the limits.
  CLIENT_IP_HEADER: 'x-e2e-client',
};

/** Runs a Node script from node_modules (no shell: arguments may be Persian). */
function run(script, args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    env: { ...env, ...extraEnv },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    console.error(`[e2e] failed: ${script} ${args.join(' ')}`);
    process.exit(1);
  }
}

console.log('[e2e] preparing the bdcenter_e2e database');
{
  const url = new URL(databaseUrl);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(name)) throw new Error(`unexpected database name ${name}`);
  url.pathname = '/postgres';
  url.search = '';
  const server = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const found = await server.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${name}`;
  if (found.length === 0) await server.$executeRawUnsafe(`CREATE DATABASE ${name}`);
  await server.$disconnect();
}
run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);

console.log('[e2e] creating the test admin');
run(
  'node_modules/tsx/dist/cli.mjs',
  ['scripts/create-admin.ts', '--email', admin.email, '--name', 'مدیر آزمون'],
  {
    ADMIN_PASSWORD: admin.password,
  },
);

mkdirSync('.tmp-build', { recursive: true });
writeFileSync(
  '.tmp-build/e2e-state.json',
  JSON.stringify({
    runId,
    siteUrl,
    databaseUrl,
    smsOutbox: `http://127.0.0.1:${SMS_PORT}/outbox`,
    admin,
  }),
);

if (process.env.E2E_REUSE_BUILD !== '1' || !existsSync('.next-e2e/BUILD_ID')) {
  console.log('[e2e] building the site (production mode)');
  // A build into another folder rewrites next-env.d.ts and tsconfig.json to
  // point at it; put both back so the checkout stays unchanged.
  const kept = ['next-env.d.ts', 'tsconfig.json'].map((file) => [file, readFileSync(file, 'utf8')]);
  const restore = () => kept.forEach(([file, content]) => writeFileSync(file, content));
  process.once('exit', restore); // also when the build fails and run() exits
  run('node_modules/next/dist/bin/next', ['build'], { NODE_OPTIONS: '--max-old-space-size=2560' });
  restore();
}

// Fake Kavenegar: records every message, always answers "accepted".
const outbox = [];
createServer((request, response) => {
  if (request.method === 'GET' && request.url?.startsWith('/outbox')) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(outbox));
    return;
  }
  let body = '';
  request.on('data', (chunk) => (body += chunk));
  request.on('end', () => {
    const fields = Object.fromEntries(new URLSearchParams(body));
    outbox.push({
      to: fields.receptor,
      text: fields.message ?? fields.token ?? '',
      at: Date.now(),
    });
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ return: { status: 200, message: 'OK' }, entries: [] }));
  });
}).listen(SMS_PORT, '127.0.0.1');

console.log(`[e2e] starting the site on ${siteUrl}`);
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(E2E_PORT)],
  { cwd: root, env, stdio: 'inherit' },
);
server.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.kill();
    process.exit(0);
  });
}

import { defineConfig } from '@playwright/test';

/**
 * Browser tests (`npm run test:e2e`) against a production build with its own
 * database; scripts/e2e-server.mjs sets everything up. They use the Chrome
 * installed on the machine (`channel: 'chrome'`), so Playwright downloads no
 * browsers. One worker: the flows share one database and build on each other.
 */
/** Sent with every request; the server keys rate limits on it (CLIENT_IP_HEADER). */
const client = `e2e-${Date.now().toString(36)}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  outputDir: '.tmp-build/e2e-results',
  use: {
    baseURL: 'http://127.0.0.1:3030',
    channel: 'chrome',
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: { 'x-e2e-client': client },
    // The machine's system proxy must not see local traffic.
    launchOptions: { args: ['--no-proxy-server'] },
  },
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:3030/api/health',
    timeout: 600_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

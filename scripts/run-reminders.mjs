/**
 * Calls the reminders job of a running site, like the production scheduler
 * does (deploy/scheduler/run.sh): `npm run reminders:run`.
 *
 *   --url <address>   site to call (default http://127.0.0.1:3010, the dev server;
 *                     the LAN preview is http://127.0.0.1:3020)
 *   --every <min>     keep running and call again every <min> minutes
 *
 * Reads CRON_SECRET from .env (the site must have the same value).
 */
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const url = new URL('/api/cron/reminders', option('url', 'http://127.0.0.1:3010'));
const everyMinutes = Number(option('every', '0'));
const secret = process.env.CRON_SECRET?.trim();
if (!secret) {
  console.error('CRON_SECRET is not set in .env (see .env.example).');
  process.exit(1);
}

async function once() {
  const stamp = new Date().toISOString();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    console.log(`${stamp} ${response.status} ${await response.text()}`);
    return response.ok;
  } catch (error) {
    console.error(`${stamp} ${url} unreachable: ${error.message}`);
    return false;
  }
}

if (everyMinutes > 0) {
  console.log(`calling ${url} every ${everyMinutes} min (Ctrl+C to stop)`);
  await once();
  setInterval(once, everyMinutes * 60 * 1000);
} else {
  process.exitCode = (await once()) ? 0 : 1;
}

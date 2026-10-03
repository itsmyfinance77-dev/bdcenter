import { checkCronAuth } from '@/lib/cron-auth';
import { runReminders } from '@/modules/reminders/service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/**
 * Sends the reminder SMS that are due (see src/modules/reminders). Called by
 * the scheduler every 15 minutes with `Authorization: Bearer <CRON_SECRET>`;
 * the proxy does not route /api/cron from the internet (deploy/Caddyfile).
 */
export async function POST(request: Request) {
  const auth = checkCronAuth(request.headers.get('authorization'));
  if (auth !== 'ok') {
    return Response.json(
      { error: auth },
      { status: auth === 'unconfigured' ? 503 : 401, headers: noStore },
    );
  }
  return Response.json(await runReminders(), { headers: noStore });
}

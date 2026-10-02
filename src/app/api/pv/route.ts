import { clientIp } from '@/lib/client-ip';
import { consume, LIMITS } from '@/modules/ratelimit/service';
import { normalizeTrackedPath, recordPageView } from '@/modules/stats/service';

/** Crawlers that run JavaScript still announce themselves; they are not visitors. */
const botAgent = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|monitor/i;

/**
 * Anonymous page-view beacon (see src/components/site/page-view-beacon.tsx).
 * Stores only a per-day count for the path. Always answers 204 so it never
 * shows up as an error in the visitor's browser.
 */
export async function POST(request: Request) {
  const done = () => new Response(null, { status: 204 });
  if (botAgent.test(request.headers.get('user-agent') ?? '')) return done();
  const path = normalizeTrackedPath((await request.text()).slice(0, 400));
  if (!path) return done();
  try {
    if (!(await consume(`pv:ip:${await clientIp()}`, LIMITS.pageViews))) return done();
    await recordPageView(path);
  } catch (error) {
    console.error('page view not recorded', error);
  }
  return done();
}

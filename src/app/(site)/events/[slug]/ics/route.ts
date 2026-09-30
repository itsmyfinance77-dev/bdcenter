import { calendarResponse } from '@/lib/ical';
import { decodeParam } from '@/lib/params';
import { eventIcs } from '@/modules/calendar/service';

export const dynamic = 'force-dynamic';

/** One event as an .ics file, for "add to calendar". */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ics = await eventIcs(decodeParam((await params).slug));
  if (!ics) return new Response('Not found', { status: 404 });
  return calendarResponse(ics.body, `event-${ics.id}.ics`);
}

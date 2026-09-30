import { calendarResponse } from '@/lib/ical';
import { decodeParam } from '@/lib/params';
import { courseIcs } from '@/modules/calendar/service';

export const dynamic = 'force-dynamic';

/** One course as an .ics file, for "add to calendar". */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const ics = await courseIcs(decodeParam((await params).slug));
  if (!ics) return new Response('Not found', { status: 404 });
  return calendarResponse(ics.body, `course-${ics.id}.ics`);
}

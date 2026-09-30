import { calendarResponse } from '@/lib/ical';
import { calendarFeed } from '@/modules/calendar/service';

export const dynamic = 'force-dynamic';

/** Subscribable feed of events and courses (webcal / "calendar from URL"). */
export async function GET() {
  return calendarResponse(await calendarFeed(), 'bdcenter.ics', true);
}

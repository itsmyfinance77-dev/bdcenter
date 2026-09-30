import { calendarResponse } from '@/lib/ical';
import { memberBookingIcs } from '@/modules/appointments/service';
import { getCurrentMember } from '@/modules/members/service';

export const dynamic = 'force-dynamic';

/** The signed-in member's own booking as an .ics file. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const body = await memberBookingIcs(id, member.id);
  if (!body) return new Response('Not found', { status: 404 });
  return calendarResponse(body, `booking-${id}.ics`);
}

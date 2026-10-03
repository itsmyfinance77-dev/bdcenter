import { memberCalendarFeed } from '@/modules/calendar/service';

export const dynamic = 'force-dynamic';

/** A member's personal feed, at the secret address shown on their account page. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await params;
  const token = file.endsWith('.ics') ? file.slice(0, -4) : file;
  const body = await memberCalendarFeed(id, token);
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="my-bdcenter.ics"',
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  });
}

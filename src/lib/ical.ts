/**
 * Minimal iCalendar (RFC 5545) writer for "add to calendar" downloads and the
 * subscribable feed. Times are written in UTC, so every phone shows them in
 * its own time zone; text is escaped and long lines are folded at 75 bytes
 * without splitting a UTF-8 character.
 */

export type CalendarEvent = {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  updatedAt?: Date | null;
};

/** Events without an end time are shown as one hour long. */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

export function icalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

const encoder = new TextEncoder();

/** Splits a content line into 75-byte pieces joined by CRLF + space. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const pieces: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // Continuation lines start with a space, which counts toward their 75 bytes.
    const limit = pieces.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      pieces.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  pieces.push(current);
  return pieces.join('\r\n ');
}

function eventLines(event: CalendarEvent, now: Date): string[] {
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + DEFAULT_DURATION_MS);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${icalDate(event.updatedAt ?? now)}`,
    `DTSTART:${icalDate(event.startsAt)}`,
    `DTEND:${icalDate(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('END:VEVENT');
  return lines;
}

export function buildCalendar(
  events: CalendarEvent[],
  options: { name: string; now?: Date } = { name: '' },
): string {
  const now = options.now ?? new Date();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//bdcenter.yazdccima.com//calendar//FA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...(options.name ? [`X-WR-CALNAME:${escapeText(options.name)}`] : []),
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/** HTTP response for a .ics download (`inline` for the subscription feed). */
export function calendarResponse(body: string, filename: string, inline = false): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}

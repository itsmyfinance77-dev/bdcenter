import { formatJalaliInput, parseJalaliDateTime } from '@/lib/jalali';
import { toLatinDigits } from '@/lib/validation';

/**
 * The sessions of a course (owner's request, 2026-10-04): each one a date, a
 * start time, an optional end time on the same day, and optionally its own
 * place and topic. The course form sends them as numbered rows
 * (`s0date`, `s0start`, `s0end`, `s0location`, `s0topic`, `s1date`, …).
 * Kept free of database code so it can be unit-tested.
 */

export const MAX_SESSIONS = 60;

export type SessionInput = {
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  topic: string | null;
};

const timePattern = /^(\d{1,2}):(\d{2})$/;

function time(text: string): string | null {
  const match = timePattern.exec(toLatinDigits(text.trim()));
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return `${match[1]!.padStart(2, '0')}:${match[2]}`;
}

/**
 * Reads the session rows of the course form. Empty rows are skipped; the
 * result is sorted by start. Errors are keyed by the field name.
 */
export function parseSessions(values: Record<string, string>) {
  const sessions: SessionInput[] = [];
  const errors: Record<string, string> = {};
  for (let i = 0; i < MAX_SESSIONS; i += 1) {
    const value = (field: string) => (values[`s${i}${field}`] ?? '').trim();
    const [date, start, end, location, topic] = ['date', 'start', 'end', 'location', 'topic'].map(
      value,
    ) as [string, string, string, string, string];
    if (!date && !start && !end && !location && !topic) continue;

    const startTime = time(start);
    const startsAt = startTime ? parseJalaliDateTime(`${date} ${startTime}`) : null;
    if (!date || !parseJalaliDateTime(date)) {
      errors[`s${i}date`] = 'تاریخ را به شکل ۱۴۰۵/۰۸/۰۱ بنویسید.';
    } else if (!startTime) {
      errors[`s${i}start`] = 'ساعت شروع را به شکل ۱۶:۰۰ بنویسید.';
    }
    let endsAt: Date | null = null;
    if (end) {
      const endTime = time(end);
      if (!endTime) errors[`s${i}end`] = 'ساعت پایان را به شکل ۱۸:۰۰ بنویسید.';
      else if (startsAt) {
        endsAt = parseJalaliDateTime(`${date} ${endTime}`);
        if (!endsAt || endsAt <= startsAt) {
          errors[`s${i}end`] = 'ساعت پایان باید بعد از ساعت شروع باشد.';
        }
      }
    }
    if (location.length > 200) errors[`s${i}location`] = 'مکان بیش از حد طولانی است.';
    if (topic.length > 200) errors[`s${i}topic`] = 'موضوع بیش از حد طولانی است.';
    if (startsAt) {
      sessions.push({ startsAt, endsAt, location: location || null, topic: topic || null });
    }
  }
  sessions.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (let i = 1; i < sessions.length; i += 1) {
    if (sessions[i]!.startsAt.getTime() === sessions[i - 1]!.startsAt.getTime()) {
      errors._sessions = 'دو جلسه با یک تاریخ و ساعت شروع ثبت شده است.';
    }
  }
  return { sessions, errors };
}

/** The course's own start and end, derived from its sessions (null without sessions). */
export function courseSpan(sessions: SessionInput[]) {
  if (sessions.length === 0) return { startsAt: null, endsAt: null };
  const first = sessions[0]!;
  const last = sessions[sessions.length - 1]!;
  return { startsAt: first.startsAt, endsAt: last.endsAt ?? last.startsAt };
}

/** Form values for stored sessions, in Persian digits like the rest of the form. */
export function sessionFormValues(
  sessions: {
    startsAt: Date;
    endsAt: Date | null;
    location: string | null;
    topic: string | null;
  }[],
  persian: (text: string) => string,
): Record<string, string> {
  const values: Record<string, string> = {};
  sessions.forEach((session, i) => {
    const [date, start] = formatJalaliInput(session.startsAt).split(' ') as [string, string];
    values[`s${i}date`] = persian(date);
    values[`s${i}start`] = persian(start);
    values[`s${i}end`] = session.endsAt
      ? persian(formatJalaliInput(session.endsAt).split(' ')[1]!)
      : '';
    values[`s${i}location`] = session.location ?? '';
    values[`s${i}topic`] = session.topic ?? '';
  });
  return values;
}

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { jalaliDayStart } from '@/lib/jalali';
import { calendarFeed, courseIcs, eventIcs, getMonthGrid } from '@/modules/calendar/service';

/** Calendar grid and .ics exports against real rows (`test-cal-` slugs). */

const PREFIX = 'test-cal-';

async function cleanup() {
  await prisma.article.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

// 15 Mehr 1405, 18:00 Tehran — and a course on the last day of the month, 23:30 Tehran.
const eventStart = new Date(jalaliDayStart(1405, 7, 15)!.getTime() + 18 * 3600_000);
const courseStart = new Date(jalaliDayStart(1405, 7, 30)!.getTime() + 23.5 * 3600_000);

beforeAll(async () => {
  await cleanup();
  await prisma.article.createMany({
    data: [
      {
        kind: 'EVENT',
        slug: `${PREFIX}event`,
        title: 'رویداد تقویم',
        bodyMarkdown: 'x',
        eventStartsAt: eventStart,
        eventLocation: 'پارک علم و فناوری',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      {
        kind: 'EVENT',
        slug: `${PREFIX}draft`,
        title: 'پیش‌نویس',
        bodyMarkdown: 'x',
        eventStartsAt: eventStart,
        status: 'DRAFT',
      },
      {
        kind: 'NEWS',
        slug: `${PREFIX}news`,
        title: 'خبر',
        bodyMarkdown: 'x',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    ],
  });
  await prisma.course.create({
    data: {
      slug: `${PREFIX}course`,
      title: 'دوره تقویم',
      status: 'PUBLISHED',
      startsAt: courseStart,
      endsAt: new Date(courseStart.getTime() + 7200_000),
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('events calendar', () => {
  it('puts published events and courses on their Tehran day', async () => {
    const grid = await getMonthGrid({ year: 1405, month: 7 }, new Date(eventStart));
    const mine = (day: number) => grid.days[day - 1]!.items.map((item) => item.title);
    expect(grid.days).toHaveLength(30);
    expect(grid.leadingBlanks).toBe(4);
    expect(mine(15)).toContain('رویداد تقویم');
    expect(mine(15)).not.toContain('پیش‌نویس');
    expect(mine(30)).toContain('دوره تقویم');
    expect(grid.days[14]!.isToday).toBe(true);
    expect(grid.previous).toEqual({ year: 1405, month: 6 });
  });

  it('exports single items and the feed as iCalendar', async () => {
    const event = await eventIcs(`${PREFIX}event`);
    expect(event?.body).toContain('SUMMARY:رویداد تقویم');
    expect(event?.body).toContain('LOCATION:پارک علم و فناوری');
    expect(await eventIcs(`${PREFIX}draft`)).toBeNull();
    expect(await eventIcs(`${PREFIX}news`)).toBeNull();

    const course = await courseIcs(`${PREFIX}course`);
    expect(course?.body).toMatch(/DTEND:\d{8}T\d{6}Z/);

    const feed = await calendarFeed(new Date(eventStart.getTime() - 86_400_000));
    expect(feed).toContain('رویداد تقویم');
    expect(feed).toContain('دوره تقویم');
    expect(feed).not.toContain('پیش‌نویس');
  });
});

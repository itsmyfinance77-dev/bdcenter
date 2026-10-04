import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { availabilityLabel, trainingCopy } from '@/content/training';
import { formatDateTime, formatNumber } from '@/lib/format';
import { courseCoverUrl, listPublishedCourses } from '@/modules/training/service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: trainingCopy.title,
  description: trainingCopy.lead,
  alternates: { canonical: '/courses' },
};

export default async function CoursesPage() {
  const courses = await listPublishedCourses();

  return (
    <>
      <PageHeader
        title={trainingCopy.title}
        lead={trainingCopy.lead}
        crumbs={[{ title: trainingCopy.title }]}
      />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
        {courses.length === 0 ? (
          <p className="rounded-panel border border-line bg-white p-6 text-sm text-ink-2">
            {trainingCopy.empty}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-panel border border-line bg-white">
            {courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.slug}`}
                  className="flex gap-4 px-5 py-4 hover:bg-surface-2"
                >
                  {courseCoverUrl(course.coverKey, 'sm') ? (
                    <span className="relative hidden aspect-[4/3] w-28 flex-none overflow-hidden rounded-card bg-surface-2 sm:block">
                      <Image
                        src={courseCoverUrl(course.coverKey, 'sm')!}
                        alt=""
                        fill
                        unoptimized
                        sizes="7rem"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <span className="block min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
                      <span
                        className={`rounded-chip px-2 py-0.5 ${course.availability === 'open' ? 'bg-success/10 text-success' : 'bg-surface-2 text-ink-2'}`}
                      >
                        {availabilityLabel[course.availability]}
                      </span>
                      {course.startsAt ? (
                        <time dateTime={course.startsAt.toISOString()}>
                          {formatDateTime(course.startsAt)}
                        </time>
                      ) : null}
                      {course.sessionCount > 1 ? (
                        <span>· {formatNumber(course.sessionCount)} جلسه</span>
                      ) : null}
                      {course.location ? <span>· {course.location}</span> : null}
                    </div>
                    <h2 className="mt-1 font-semibold text-ink">{course.title}</h2>
                    {course.instructor ? (
                      <p className="mt-1 text-sm text-ink-2">مدرس: {course.instructor}</p>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-sm text-ink-2">
          {trainingCopy.chamberLinkLead}{' '}
          <a
            href={trainingCopy.chamberUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            {trainingCopy.chamberLinkLabel}
          </a>
        </p>
      </div>
    </>
  );
}

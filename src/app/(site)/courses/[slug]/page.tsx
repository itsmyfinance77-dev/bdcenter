import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCalendar } from '@/components/add-to-calendar';
import { MarkdownBody } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { requestStatusLabel } from '@/content/admin';
import { availabilityLabel, enrollErrorMessage, trainingCopy } from '@/content/training';
import { formatDateTime, formatNumber } from '@/lib/format';
import { decodeParam } from '@/lib/params';
import { getCurrentMember } from '@/modules/members/service';
import { getMemberEnrollment, getPublishedCourse } from '@/modules/training/service';
import { enrollAction } from './actions';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const course = await getPublishedCourse(decodeParam((await params).slug));
  if (!course) return {};
  return {
    title: course.title,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

const primaryButton =
  'inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover';

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ result?: string }>;
}) {
  const [{ slug: rawSlug }, { result }] = await Promise.all([params, searchParams]);
  const slug = decodeParam(rawSlug);
  const course = await getPublishedCourse(slug);
  if (!course) notFound();

  const member = await getCurrentMember();
  const enrollment = member ? await getMemberEnrollment(course.id, member.id) : null;
  const coursePath = `/courses/${encodeURIComponent(course.slug)}`;
  const resultMessage =
    result === 'ok'
      ? trainingCopy.enrolled
      : result && result in enrollErrorMessage
        ? enrollErrorMessage[result as keyof typeof enrollErrorMessage]
        : null;

  const facts: [string, string][] = [];
  if (course.instructor) facts.push(['مدرس', course.instructor]);
  if (course.startsAt) facts.push(['زمان شروع', formatDateTime(course.startsAt)]);
  if (course.endsAt) facts.push(['زمان پایان', formatDateTime(course.endsAt)]);
  if (course.location) facts.push(['مکان', course.location]);
  if (course.capacity !== null) facts.push(['ظرفیت', formatNumber(course.capacity)]);
  if (course.seatsLeft !== null && course.availability === 'open') {
    facts.push(['ظرفیت باقی‌مانده', formatNumber(course.seatsLeft)]);
  }

  return (
    <>
      <PageHeader
        title={course.title}
        crumbs={[{ title: trainingCopy.title, href: '/courses' }, { title: course.title }]}
      />
      <div className="mx-auto grid max-w-(--container-page) gap-6 px-4 py-12 lg:grid-cols-[1fr_320px]">
        <article className="rounded-panel border border-line bg-white p-6">
          {course.description ? (
            <MarkdownBody source={course.description} />
          ) : (
            <p className="text-sm text-ink-2">توضیحات این دوره به‌زودی اضافه می‌شود.</p>
          )}
        </article>

        <aside className="space-y-4 rounded-panel border border-line bg-white p-6 lg:self-start">
          <p
            className={`inline-block rounded-chip px-2 py-0.5 text-xs ${course.availability === 'open' ? 'bg-success/10 text-success' : 'bg-surface-2 text-ink-2'}`}
          >
            {availabilityLabel[course.availability]}
          </p>
          {facts.length > 0 ? (
            <dl className="space-y-2 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-ink-2">{label}</dt>
                  <dd className="text-end text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {resultMessage ? (
            <p
              role="status"
              className={`rounded-control border px-4 py-3 text-sm ${result === 'ok' ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'}`}
            >
              {resultMessage}
            </p>
          ) : null}

          {enrollment ? (
            <p className="text-sm text-ink">
              {trainingCopy.alreadyEnrolled} وضعیت: {requestStatusLabel[enrollment.status]} —{' '}
              <Link href="/account" className="text-primary hover:underline">
                حساب کاربری
              </Link>
            </p>
          ) : course.availability !== 'open' ? null : !member ? (
            <Link
              href={`/account/login?next=${encodeURIComponent(coursePath)}`}
              className={primaryButton}
            >
              {trainingCopy.loginToEnroll}
            </Link>
          ) : !member.fullName ? (
            <Link
              href={`/account?next=${encodeURIComponent(coursePath)}`}
              className={primaryButton}
            >
              {trainingCopy.profileNeeded}
            </Link>
          ) : (
            <form action={enrollAction.bind(null, course.slug)}>
              <button type="submit" className={primaryButton}>
                {trainingCopy.enroll}
              </button>
            </form>
          )}
          {course.startsAt && course.startsAt > new Date() ? (
            <AddToCalendar href={`${coursePath}/ics`} />
          ) : null}
        </aside>
      </div>
    </>
  );
}

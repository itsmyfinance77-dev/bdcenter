import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownBody } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { appointmentsCopy, serviceLabel } from '@/content/appointments';
import { formatTime, formatWeekdayDate } from '@/lib/format';
import {
  listStaffWithFreeSlots,
  serviceBySlug,
  staffPhotoUrl,
} from '@/modules/appointments/service';

export const dynamic = 'force-dynamic';

type Params = { service: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const service = serviceBySlug[(await params).service];
  if (!service) return {};
  return {
    title: appointmentsCopy.pageTitle(serviceLabel[service]),
    description: appointmentsCopy.lead,
    alternates: { canonical: `/appointments/${(await params).service}` },
  };
}

/** Groups slots by their Tehran calendar day, keeping order. */
function byDay<T extends { startsAt: Date }>(slots: T[]) {
  const days = new Map<string, T[]>();
  for (const slot of slots) {
    const key = formatWeekdayDate(slot.startsAt);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  return [...days.entries()];
}

export default async function AppointmentsPage({ params }: { params: Promise<Params> }) {
  const service = serviceBySlug[(await params).service];
  if (!service) notFound();
  const staff = await listStaffWithFreeSlots(service);
  const title = appointmentsCopy.pageTitle(serviceLabel[service]);

  return (
    <>
      <PageHeader title={title} lead={appointmentsCopy.lead} crumbs={[{ title }]} />
      <div className="mx-auto max-w-(--container-page) space-y-6 px-4 py-12">
        {staff.length === 0 ? (
          <p className="rounded-panel border border-line bg-white p-6 text-sm text-ink-2">
            {appointmentsCopy.noStaff}
          </p>
        ) : (
          staff.map((person) => (
            <section
              key={person.id}
              aria-labelledby={`staff-${person.id}`}
              className="grid gap-6 rounded-panel border border-line bg-white p-6 lg:grid-cols-[280px_1fr]"
            >
              <div>
                <div className="flex items-center gap-4">
                  {staffPhotoUrl(person.photoKey) ? (
                    <div className="relative size-20 flex-none overflow-hidden rounded-full bg-surface-2">
                      <Image
                        src={staffPhotoUrl(person.photoKey)!}
                        alt={person.fullName}
                        fill
                        unoptimized
                        sizes="5rem"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div>
                    <h2 id={`staff-${person.id}`} className="text-lg font-bold text-brand-900">
                      {person.fullName}
                    </h2>
                    {person.title ? <p className="text-sm text-ink-2">{person.title}</p> : null}
                  </div>
                </div>
                {person.bio ? (
                  <div className="mt-3 text-sm [&_*]:text-sm [&_*]:leading-7">
                    <MarkdownBody source={person.bio} />
                  </div>
                ) : null}
              </div>
              <div>
                {person.slots.length === 0 ? (
                  <p className="text-sm text-ink-2">{appointmentsCopy.noSlots}</p>
                ) : (
                  <ul className="space-y-4">
                    {byDay(person.slots).map(([day, slots]) => (
                      <li key={day}>
                        <h3 className="mb-2 text-sm font-semibold text-ink">{day}</h3>
                        <ul className="flex flex-wrap gap-2">
                          {slots.map((slot) => (
                            <li key={slot.id}>
                              <Link
                                href={`/appointments/book/${slot.id}`}
                                className="inline-block rounded-control border border-line px-3 py-1.5 text-sm text-primary hover:border-primary hover:bg-primary/5"
                                title={slot.location ?? undefined}
                              >
                                {formatTime(slot.startsAt)}
                                <span className="sr-only"> — {appointmentsCopy.bookLink}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}

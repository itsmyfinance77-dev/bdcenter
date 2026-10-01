import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/site/icons';
import { FormCard, PageBody } from '@/components/site/page-body';
import { consultingCopy } from '@/content/members';
import { homeCopy, servicePageCopy, serviceTiles, tileHref } from '@/content/site';
import { getCurrentMember } from '@/modules/members/service';
import { ConsultingForm } from './consulting-form';

type Params = { slug: string };

function findTile(slug: string) {
  return serviceTiles.find((tile) => tile.slug === slug);
}

export function generateStaticParams(): Params[] {
  return serviceTiles.map((tile) => ({ slug: tile.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const tile = findTile((await params).slug);
  if (!tile) return {};
  return {
    title: tile.title,
    description: 'summary' in tile ? tile.summary : undefined,
    alternates: { canonical: `/services/${tile.slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const tile = findTile((await params).slug);
  if (!tile) notFound();
  if ('href' in tile) redirect(tile.href);

  const crumbs = [{ title: 'خدمات', href: '/#services' }, { title: tile.title }];

  if (tile.slug === 'consulting') {
    const member = await getCurrentMember();
    const prefill = member
      ? {
          fullName: member.fullName ?? '',
          companyName: member.companyName ?? '',
          nationalId: member.nationalId ?? '',
          phone: member.phone,
          email: member.email ?? '',
        }
      : undefined;
    return (
      <>
        <PageHeader title={tile.title} lead={servicePageCopy.consulting} crumbs={crumbs} />
        <PageBody narrow>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/25 bg-primary-tint/60 p-4 text-[15px] font-semibold text-ink">
            {servicePageCopy.bookingPrompt}
            <Link
              href="/appointments/consulting"
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 font-bold text-white hover:bg-primary-hover hover:text-white"
            >
              <Icon name="clock" size={18} strokeWidth={2} />
              {servicePageCopy.bookingLink}
            </Link>
          </div>
          <FormCard
            id="consulting-form-heading"
            title="ثبت درخواست مشاوره"
            note={
              member ? null : (
                <p className="text-sm text-ink-2">
                  <Link
                    href="/account/login?next=/services/consulting"
                    className="font-semibold text-primary hover:underline"
                  >
                    ورود به حساب کاربری
                  </Link>
                  {' — '}
                  {consultingCopy.signInHint}
                </p>
              )
            }
          >
            <ConsultingForm prefill={prefill} />
          </FormCard>
        </PageBody>
      </>
    );
  }

  // OQ-BD-06: content for the remaining tiles has not arrived yet.
  const others = serviceTiles.filter((other) => other.slug !== tile.slug);
  return (
    <>
      <PageHeader title={tile.title} crumbs={crumbs} />
      <PageBody>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-[clamp(24px,4vw,40px)]">
          <div className="flex flex-col items-start gap-4 rounded-3xl border-[1.5px] border-dashed border-line-strong bg-surface-2 p-[clamp(28px,4vw,44px)]">
            <div className="flex items-center gap-3">
              <span className="grid size-[52px] place-items-center rounded-[14px] bg-surface-3 text-ink-3">
                <Icon name={tile.icon} size={24} strokeWidth={1.7} />
              </span>
              <span className="rounded-full border border-[#d3dae6] bg-white px-3 py-1 text-[13px] font-bold text-ink-2">
                {homeCopy.soon}
              </span>
            </div>
            <p className="text-[17px] leading-loose text-ink-soon">{servicePageCopy.placeholder}</p>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center gap-2 text-[14.5px] font-bold text-primary"
            >
              پرسش درباره این خدمت
              <Icon name="arrowStart" size={16} strokeWidth={2} />
            </Link>
          </div>
          <nav aria-labelledby="other-services" className="flex flex-col gap-3.5">
            <h2 id="other-services" className="text-[17px] font-extrabold text-brand-900">
              سایر خدمات مرکز
            </h2>
            <ul className="flex flex-col gap-2">
              {others.map((other) => {
                const live = !other.isPlaceholder;
                return (
                  <li key={other.slug}>
                    <Link
                      href={tileHref(other)}
                      className="flex min-h-14 items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-2 text-ink transition-[border-color,transform] duration-250 ease-(--ease-out-soft) hover:-translate-y-0.5 hover:border-line-hover hover:text-brand-900"
                    >
                      <span
                        className={`grid size-9 flex-none place-items-center rounded-[10px] ${live ? 'bg-primary-tint text-primary' : 'bg-surface-3 text-ink-3'}`}
                      >
                        <Icon name={other.icon} size={18} />
                      </span>
                      <span className="flex-1 text-[14.5px] font-semibold">{other.title}</span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${live ? 'border-[#bfe6e7] bg-accent-tint text-accent-ink' : 'border-[#d3dae6] bg-white text-ink-2'}`}
                      >
                        {live ? homeCopy.live : homeCopy.soon}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </PageBody>
    </>
  );
}

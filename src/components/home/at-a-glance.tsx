import { homeCopy } from '@/content/site';
import { toPersianDigits } from '@/lib/format';
import type { HomeStat } from '@/modules/settings/service';

/**
 * «مرکز در یک نگاه» (BDC Yazd design): up to four figures the center enters
 * in «تنظیمات سایت» (OQ-BD-18). Not rendered while there are none, so no
 * sample number is ever published.
 */
export function AtAGlance({ stats }: { stats: HomeStat[] }) {
  if (stats.length === 0) return null;
  return (
    <section
      aria-labelledby="glance-title"
      className="relative isolate overflow-hidden bg-brand-950 py-[clamp(56px,7vw,88px)] text-white"
    >
      <div
        aria-hidden="true"
        className="bg-dots absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_70%_at_50%_50%,#000_25%,transparent_80%)]"
      />
      <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)]">
        <h2
          id="glance-title"
          data-reveal=""
          className="mb-10 text-center text-[clamp(24px,3vw,34px)] font-extrabold"
        >
          {homeCopy.glanceTitle}
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={`${stat.label}-${index}`}
              data-reveal=""
              data-reveal-delay={String(80 * index)}
              className="flex flex-col-reverse items-center gap-2 text-center"
            >
              <dt className="text-[15px] leading-7 text-on-dark">{stat.label}</dt>
              <dd className="text-[clamp(34px,4.4vw,52px)] leading-none font-black text-accent-glow">
                {toPersianDigits(stat.value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

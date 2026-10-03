import Link from 'next/link';
import { Icon } from '@/components/site/icons';
import { homeCopy } from '@/content/site';
import { listServiceTiles, type ServiceTileData } from '@/modules/services/service';

const liveCard =
  'flex h-full min-h-[170px] flex-col gap-3.5 rounded-3xl border border-line bg-white p-7 text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1 hover:border-line-hover hover:text-ink hover:shadow-[0_24px_48px_-26px_rgba(11,34,87,.4)]';

/**
 * "خدمات مرکز" bento grid (BDC Yazd design): investment services as the large
 * feature tile, consulting and the service desk as live wide tiles, then
 * training (live) and the other services — announced-soon until staff switch
 * them live in the panel (src/modules/services).
 */
export async function ServiceTiles() {
  const tiles = await listServiceTiles();
  const bySlug = (slug: string) => tiles.find((tile) => tile.slug === slug)!;
  const investment = bySlug('investment-services');
  const consulting = bySlug('consulting');
  const serviceDesk = bySlug('service-desk');
  const training = bySlug('training');
  const others = ['industry-desk', 'tech-events', 'experience-cafe'].map(bySlug);

  return (
    <section id="services" aria-labelledby="services-title" className="py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto max-w-(--container-page) px-[clamp(20px,4vw,32px)]">
        <div
          data-reveal=""
          className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
        >
          <h2
            id="services-title"
            className="text-[clamp(28px,3.4vw,40px)] leading-[1.35] font-extrabold text-brand-900"
          >
            {homeCopy.servicesTitle}
          </h2>
          <div className="flex gap-4 text-[13.5px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent" />
              {homeCopy.live}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border-[1.5px] border-dashed border-[#7d89a0]" />
              {homeCopy.soon}
            </span>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <li data-reveal="" className="sm:col-span-2 lg:row-span-2">
            <Link
              href={investment.href}
              className="relative flex h-full min-h-60 flex-col gap-[18px] overflow-hidden rounded-3xl bg-brand-900 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(42,108,240,.55),transparent_60%),radial-gradient(90%_70%_at_0%_100%,rgba(20,163,168,.4),transparent_60%)] p-[clamp(24px,3vw,36px)] text-white transition-[transform,box-shadow] duration-350 ease-(--ease-out-soft) hover:-translate-y-1 hover:text-white hover:shadow-[0_30px_60px_-28px_rgba(20,80,200,.8)] lg:min-h-[360px]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-14 place-items-center rounded-2xl border border-white/18 bg-white/10 text-white">
                  <Icon name={investment.icon} size={26} strokeWidth={1.7} />
                </span>
                <span className="rounded-full border border-white/22 bg-white/10 px-3.5 py-1.5 text-[13.5px] font-bold text-white">
                  {investment.isPlaceholder ? homeCopy.soon : homeCopy.live}
                </span>
              </div>
              <h3 className="text-[clamp(26px,3vw,34px)] leading-[1.35] font-extrabold">
                {investment.title}
              </h3>
              <p className="max-w-[440px] text-base leading-loose text-pretty text-on-dark">
                {investment.isPlaceholder
                  ? `${homeCopy.soonText}.`
                  : (investment.summary ?? homeCopy.moreInfo)}
              </p>
              <span className="mt-auto inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-bold text-accent-glow">
                {homeCopy.moreInfo}
                <Icon name="arrowStart" size={18} strokeWidth={2} />
              </span>
            </Link>
          </li>

          <li data-reveal="" data-reveal-delay="80" className="lg:col-span-2">
            <Link href={consulting.href} className={liveCard}>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
                <span className="grid size-12 flex-none place-items-center rounded-[14px] bg-primary-tint text-primary">
                  <Icon name={consulting.icon} size={24} strokeWidth={1.7} />
                </span>
                <h3 className="text-[21px] font-extrabold text-brand-900">{consulting.title}</h3>
                <span className="rounded-full bg-accent-tint px-2.5 py-1 text-[12.5px] font-bold text-accent-ink">
                  {consulting.summary}
                </span>
              </div>
              <p className="text-[15px] leading-[1.95] text-pretty text-ink-2">
                {consulting.description}
              </p>
              <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-primary">
                {consulting.cta}
                <Icon name="arrowStart" size={16} strokeWidth={2} />
              </span>
            </Link>
          </li>

          <li data-reveal="" data-reveal-delay="160" className="lg:col-span-2">
            <Link href={serviceDesk.href} className={liveCard}>
              <div className="flex items-center gap-3.5">
                <span className="grid size-12 flex-none place-items-center rounded-[14px] bg-accent-tint text-accent-ink">
                  <Icon name={serviceDesk.icon} size={24} strokeWidth={1.7} />
                </span>
                <h3 className="text-[21px] font-extrabold text-brand-900">{serviceDesk.title}</h3>
              </div>
              <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-accent-ink">
                {serviceDesk.cta}
                <Icon name="arrowStart" size={16} strokeWidth={2} />
              </span>
            </Link>
          </li>

          <li data-reveal="" data-reveal-delay="0">
            <Link
              href={training.href}
              className="flex h-full min-h-44 flex-col gap-3.5 rounded-card border border-line bg-white p-[22px] text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1 hover:border-line-hover hover:text-ink hover:shadow-[0_24px_48px_-26px_rgba(11,34,87,.4)]"
            >
              <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-primary-tint text-primary">
                <Icon name={training.icon} size={21} strokeWidth={1.7} />
              </span>
              <h3 className="text-[17px] font-extrabold text-brand-900">{training.title}</h3>
              <span className="mt-auto flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
                {training.cta}
                <Icon name="arrowStart" size={16} strokeWidth={2} />
              </span>
            </Link>
          </li>

          {others.map((tile, index) => (
            <li key={tile.slug} data-reveal="" data-reveal-delay={String(80 * (index + 1))}>
              {tile.isPlaceholder ? <SoonTile tile={tile} /> : <LiveTile tile={tile} />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A small tile for a service staff have switched live. */
function LiveTile({ tile }: { tile: ServiceTileData }) {
  return (
    <Link
      href={tile.href}
      className="flex h-full min-h-44 flex-col gap-3.5 rounded-card border border-line bg-white p-[22px] text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1 hover:border-line-hover hover:text-ink hover:shadow-[0_24px_48px_-26px_rgba(11,34,87,.4)]"
    >
      <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-primary-tint text-primary">
        <Icon name={tile.icon} size={21} strokeWidth={1.7} />
      </span>
      <h3 className="text-[17px] font-extrabold text-brand-900">{tile.title}</h3>
      {tile.summary ? <p className="text-[13px] leading-[1.8] text-ink-2">{tile.summary}</p> : null}
      <span className="mt-auto flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
        {homeCopy.moreInfo}
        <Icon name="arrowStart" size={16} strokeWidth={2} />
      </span>
    </Link>
  );
}

function SoonTile({ tile }: { tile: ServiceTileData }) {
  return (
    <Link
      href={tile.href}
      className="flex h-full min-h-44 flex-col gap-3.5 rounded-card border-[1.5px] border-dashed border-line-strong bg-surface-2 p-[22px] text-ink transition-[border-color,background-color] duration-250 hover:border-line-hover hover:bg-[#e4e9f2] hover:text-ink"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-[42px] flex-none place-items-center rounded-xl bg-surface-3 text-ink-3">
          <Icon name={tile.icon} size={21} strokeWidth={1.7} />
        </span>
        <span className="rounded-full border border-[#d3dae6] bg-white px-2.5 py-1 text-[12.5px] font-bold text-ink-2">
          {homeCopy.soon}
        </span>
      </div>
      <h3 className="text-[17px] font-bold text-ink-soon">{tile.title}</h3>
      <p className="mt-auto text-[13px] leading-[1.8] text-ink-2">{homeCopy.soonText}</p>
    </Link>
  );
}

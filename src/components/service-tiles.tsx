import Link from 'next/link';
import { serviceTiles } from '@/content/site';

export function ServiceTiles() {
  return (
    <section aria-labelledby="services-heading" className="mx-auto max-w-(--container-page) px-4 py-12">
      <h2 id="services-heading" className="mb-6 text-xl font-bold text-brand-900">
        خدمات مرکز
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {serviceTiles.map((tile) => {
          const href = 'externalUrl' in tile ? tile.externalUrl : `/services/${tile.slug}`;
          return (
            <Link
              key={tile.slug}
              href={href}
              className="rounded-card border border-line bg-white p-5 transition hover:border-line-hover hover:shadow-sm"
            >
              <h3 className="font-semibold text-ink">{tile.title}</h3>
              {'summary' in tile && tile.summary ? (
                <p className="mt-1 text-sm text-ink-2">{tile.summary}</p>
              ) : null}
              {tile.isPlaceholder ? (
                <span className="mt-3 inline-block rounded-chip bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
                  اطلاعات این بخش به‌زودی اضافه می‌شود
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

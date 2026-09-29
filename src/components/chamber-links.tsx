import { chamberServiceLinks } from '@/content/site';

export function ChamberLinks() {
  return (
    <section aria-labelledby="chamber-links-heading" className="bg-surface-2">
      <div className="mx-auto max-w-(--container-page) px-4 py-12">
        <h2 id="chamber-links-heading" className="mb-6 text-xl font-bold text-brand-900">
          دسترسی به خدمات اتاق بازرگانی یزد
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chamberServiceLinks.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-card border border-line bg-white px-4 py-3 text-sm text-ink hover:border-line-hover"
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

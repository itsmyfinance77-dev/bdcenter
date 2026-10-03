'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@/components/site/icons';
import { ANNOUNCEMENT_COOKIE } from '@/lib/announcement-cookie';
import type { ActiveAnnouncement } from '@/modules/settings/announcement';

/**
 * Site-wide notice above the header (set in «تنظیمات سایت»). Closing it
 * stores the notice's key in a cookie for 30 days, so the server leaves this
 * notice out of later pages; an edited notice has a new key and shows again.
 * `preview` (the settings form) shows it without the close button.
 */
export function AnnouncementBar({
  announcement,
  preview = false,
}: {
  announcement: ActiveAnnouncement;
  preview?: boolean;
}) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;

  const { text, link, linkLabel, tone, key } = announcement;
  const external = link !== null && /^https?:\/\//.test(link);

  function close() {
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${ANNOUNCEMENT_COOKIE}=${key}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax${secure}`;
    setClosed(true);
  }

  return (
    <section
      aria-label="اطلاعیه"
      className={`relative text-white ${tone === 'warning' ? 'bg-warning' : 'bg-primary'}`}
    >
      <div className="mx-auto flex max-w-(--container-page) items-center gap-3 px-[clamp(20px,4vw,32px)] py-2.5">
        <Icon name={tone === 'warning' ? 'alert' : 'flag'} size={18} className="flex-none" />
        <p className="min-w-0 flex-1 text-sm leading-6 font-medium">
          {text}
          {link ? (
            <>
              {' '}
              {external ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold whitespace-nowrap underline underline-offset-4 hover:no-underline"
                >
                  {linkLabel}
                </a>
              ) : (
                <Link
                  href={link}
                  className="font-bold whitespace-nowrap underline underline-offset-4 hover:no-underline"
                >
                  {linkLabel}
                </Link>
              )}
            </>
          ) : null}
        </p>
        {preview ? null : (
          <button
            type="button"
            onClick={close}
            aria-label="بستن اطلاعیه"
            className="grid size-9 flex-none place-items-center rounded-full transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>
    </section>
  );
}

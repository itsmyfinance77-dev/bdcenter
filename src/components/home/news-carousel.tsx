'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/site/icons';
import { homeCopy } from '@/content/site';
import { useReducedMotion } from './hero-visuals';

export type NewsCard = {
  id: string;
  kind: 'NEWS' | 'EVENT';
  href: string;
  title: string;
  date: string | null;
  dateTime: string | null;
  coverUrl: string | null;
};

const kindLabel = { NEWS: 'خبر', EVENT: 'رویداد' } as const;
const kindBadge = {
  NEWS: 'bg-primary-tint text-primary',
  EVENT: 'bg-accent-tint text-accent-ink',
} as const;

const AUTO_EVERY_MS = 4000;
const USER_PAUSE_MS = 7000;

/**
 * Horizontally scrolling news/event cards with previous/next buttons and a
 * pausable auto-advance (paused on hover, focus, recent use, reduced motion,
 * a hidden tab or when scrolled out of view). Works in RTL scroll coordinates.
 */
export function NewsCarousel({ items }: { items: NewsCard[] }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [playing, setPlaying] = useState(true);
  const reduce = useReducedMotion();
  const state = useRef({
    hover: false,
    focus: false,
    userAt: 0,
    visible: true,
    target: null as number | null,
    raf: 0,
  });

  function animateTo(el: HTMLElement, to: number) {
    const s = state.current;
    cancelAnimationFrame(s.raf);
    const sign = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    const from = Math.abs(el.scrollLeft);
    if (reduce || Math.abs(to - from) < 1) {
      el.scrollLeft = sign * to;
      s.target = null;
      return;
    }
    s.target = to;
    el.style.scrollSnapType = 'none';
    const duration = Math.min(1000, 520 + Math.abs(to - from) * 0.2);
    const start = performance.now();
    const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      el.scrollLeft = sign * (from + (to - from) * ease(p));
      if (p < 1) s.raf = requestAnimationFrame(tick);
      else {
        el.style.scrollSnapType = 'x mandatory';
        s.target = null;
      }
    };
    s.raf = requestAnimationFrame(tick);
  }

  function scrollBy(direction: 1 | -1, auto = false) {
    const el = scroller.current;
    if (!el) return;
    if (!auto) state.current.userAt = performance.now();
    const card = el.querySelector('li');
    const step = card ? card.getBoundingClientRect().width + 20 : 340;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = state.current.target ?? Math.abs(el.scrollLeft);
    const next =
      direction > 0
        ? pos >= max - 4
          ? 0
          : Math.min(max, (Math.round(pos / step) + 1) * step)
        : pos <= 4
          ? max
          : Math.max(0, (Math.round(pos / step) - 1) * step);
    animateTo(el, next);
  }

  // Latest values for the interval callback without restarting it.
  const latest = useRef({ playing, reduce, scrollBy });
  latest.current = { playing, reduce, scrollBy };

  useEffect(() => {
    const el = scroller.current;
    const s = state.current;
    const observer =
      el && 'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              s.visible = entries[0]!.isIntersecting;
            },
            { threshold: 0.35 },
          )
        : null;
    if (el) observer?.observe(el);
    const timer = setInterval(() => {
      const { playing: on, reduce: still, scrollBy: advance } = latest.current;
      if (!on || still || document.hidden || !s.visible || s.hover || s.focus) return;
      if (performance.now() - s.userAt < USER_PAUSE_MS) return;
      advance(1, true);
    }, AUTO_EVERY_MS);
    return () => {
      clearInterval(timer);
      observer?.disconnect();
      cancelAnimationFrame(s.raf);
    };
  }, []);

  const userTookOver = () => {
    const s = state.current;
    s.userAt = performance.now();
    cancelAnimationFrame(s.raf);
    s.target = null;
    if (scroller.current) scroller.current.style.scrollSnapType = 'x mandatory';
  };

  const roundButton =
    'grid size-12 cursor-pointer place-items-center rounded-full border border-line bg-white text-brand-900 transition-colors hover:border-line-hover hover:bg-surface';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/news"
          className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[14.5px] font-bold text-primary hover:bg-primary-wash"
        >
          {homeCopy.allNews}
        </Link>
        <Link
          href="/events"
          className="me-2 inline-flex min-h-11 items-center rounded-full px-3.5 text-[14.5px] font-bold text-primary hover:bg-primary-wash"
        >
          {homeCopy.allEvents}
        </Link>
        {items.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={playing ? homeCopy.newsPause : homeCopy.newsPlay}
              aria-pressed={!playing}
              onClick={() => setPlaying((p) => !p)}
              className={roundButton}
            >
              <Icon name={playing ? 'pause' : 'play'} size={18} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label={homeCopy.newsPrev}
              onClick={() => scrollBy(-1)}
              className={roundButton}
            >
              <Icon name="arrowEnd" size={20} strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={homeCopy.newsNext}
              onClick={() => scrollBy(1)}
              className={roundButton}
            >
              <Icon name="arrowStart" size={20} strokeWidth={2} />
            </button>
          </>
        ) : null}
      </div>

      <ul
        ref={scroller}
        aria-label={homeCopy.newsTitle}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') state.current.hover = true;
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') state.current.hover = false;
        }}
        onPointerDown={userTookOver}
        onWheel={userTookOver}
        onFocus={() => (state.current.focus = true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) state.current.focus = false;
        }}
        data-reveal=""
        data-reveal-delay="100"
        className="-mx-0.5 -mt-2 flex snap-x snap-mandatory basis-full gap-5 overflow-x-auto px-0.5 pt-2 pb-5 [scrollbar-color:#c7d1e2_transparent] [scrollbar-width:thin]"
      >
        {items.map((item) => (
          <li key={item.id} className="flex-[0_0_min(340px,82vw)] snap-start">
            <Link
              href={item.href}
              className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-white text-ink transition-[transform,box-shadow,border-color] duration-350 ease-(--ease-out-soft) hover:-translate-y-1.5 hover:border-[#c9d6ee] hover:text-ink hover:shadow-[0_24px_48px_-24px_rgba(11,34,87,.35)] focus-visible:-translate-y-1.5"
            >
              <div className="bg-placeholder-stripes relative aspect-[16/10]">
                {item.coverUrl ? (
                  <Image
                    src={item.coverUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="340px"
                    className="object-cover"
                  />
                ) : null}
                <span
                  className={`absolute top-3.5 right-3.5 rounded-full px-3 py-[5px] text-[13px] font-bold ${kindBadge[item.kind]}`}
                >
                  {kindLabel[item.kind]}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-[22px]">
                {item.date ? (
                  <span className="flex items-center gap-2 text-[13.5px] text-ink-2">
                    <Icon name="calendar" size={16} />
                    <time dateTime={item.dateTime ?? undefined}>{item.date}</time>
                  </span>
                ) : null}
                <h3 className="text-[17px] leading-[1.8] font-bold text-pretty text-ink">
                  {item.title}
                </h3>
                <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-primary">
                  {homeCopy.readMore}
                  <Icon name="arrowStart" size={16} strokeWidth={2} />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

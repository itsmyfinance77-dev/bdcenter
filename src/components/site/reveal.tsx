'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Fades `[data-reveal]` blocks in as they scroll into view (BDC Yazd design).
 * Only blocks still below the fold are hidden, and only after hydration, so
 * content never disappears without JavaScript; reduced-motion users skip it.
 * `data-reveal-delay` (ms) staggers neighbours.
 */
export function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.opacity = '1';
          el.style.transform = 'none';
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      const delay = Number(el.dataset.revealDelay ?? 0);
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
      el.style.transition = `opacity .8s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .8s cubic-bezier(.2,.7,.2,1) ${delay}ms`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}

'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Reports each page shown to /api/pv: the path only, no cookie or identifier. */
export function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    try {
      const body = new Blob([pathname], { type: 'text/plain' });
      if (!navigator.sendBeacon?.('/api/pv', body)) {
        void fetch('/api/pv', { method: 'POST', body: pathname, keepalive: true });
      }
    } catch {
      // Statistics are best-effort.
    }
  }, [pathname]);
  return null;
}

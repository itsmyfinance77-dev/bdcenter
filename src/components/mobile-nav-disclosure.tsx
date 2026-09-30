'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/** A `<details>` that closes itself after client-side navigation. */
export function MobileNavDisclosure({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  );
}

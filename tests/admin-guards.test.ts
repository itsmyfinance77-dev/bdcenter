import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every admin page checks the session itself. The panel layout's check is not
 * enough: on client-side navigation Next.js renders only the new page, not
 * the shared layout, and middleware only checks the cookie's signature (not
 * logout, password change or deactivation).
 */

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

const PUBLIC = ['login'];

describe('admin pages', () => {
  const files = pages(join('src', 'app', 'admin')).filter(
    (file) => !PUBLIC.some((dir) => file.split(/[\\/]/).includes(dir)),
  );

  it('are found', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)('%s calls requireAdmin', (file) => {
    expect(readFileSync(file, 'utf8')).toMatch(/requireAdmin\(/);
  });
});

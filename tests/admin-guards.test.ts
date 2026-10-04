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

  it.each(files)('%s calls requireAdmin in the page itself', (file) => {
    const page = readFileSync(file, 'utf8').split('export default')[1] ?? '';
    // The first statements of the page's body, before any branch could skip it.
    const start = page.slice(
      page.indexOf('{', page.indexOf(')')),
      page.indexOf('{', page.indexOf(')')) + 400,
    );
    expect(start).toMatch(
      /^\{\s*(?:(?:const \w+ = )?await requireAdmin\(|const \[[^\]]*\] = await Promise\.all\(\[[^\]]*requireAdmin\()/,
    );
  });
});

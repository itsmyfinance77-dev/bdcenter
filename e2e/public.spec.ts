import { expect, test } from '@playwright/test';
import { state } from './helpers';

/** Public pages render in Persian, right to left, without errors. */

const pages = [
  { path: '/', heading: null },
  { path: '/about', heading: 'درباره' },
  { path: '/news', heading: null },
  { path: '/events', heading: null },
  { path: '/events/calendar', heading: null },
  { path: '/courses', heading: 'دوره‌های آموزشی' },
  { path: '/forms', heading: null },
  { path: '/contact', heading: null },
  { path: '/privacy', heading: null },
  { path: '/terms', heading: null },
  { path: '/search?q=دوره', heading: 'جستجو' },
  { path: '/certificates', heading: 'استعلام گواهی' },
  { path: '/appointments/consulting', heading: null },
];

for (const { path, heading } of pages) {
  test(`page ${path} renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1').first()).toBeVisible();
    if (heading) await expect(page.locator('h1').first()).toContainText(heading);
    expect(errors).toEqual([]);
  });
}

test('unknown pages get the Persian 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'صفحه پیدا نشد' })).toBeVisible();
});

test('private areas send visitors to sign in', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/login/);
  await page.goto('/admin/courses');
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fcourses/);
});

test('sign-in redirects go to the login page and ignore a forged Host', async ({ request }) => {
  // Next.js turns same-origin middleware redirects into relative ones on a
  // real server; here (127.0.0.1, which Next.js rewrites to localhost) the
  // origin may differ, so only the path is checked.
  for (const [path, target] of [
    ['/account', '/account/login'],
    ['/admin/courses', '/admin/login?next=%2Fadmin%2Fcourses'],
  ] as const) {
    const response = await request.get(path, {
      maxRedirects: 0,
      headers: { Host: 'evil.example' },
    });
    expect(response.status()).toBe(307);
    const location = response.headers().location ?? '';
    expect(location.endsWith(target)).toBe(true);
    expect(location).not.toContain('evil.example');
  }
});

test('health check and security headers', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(await response.json()).toEqual({ ok: true });
  const home = await request.get('/');
  expect(home.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(home.headers()['x-content-type-options']).toBe('nosniff');
});

test('the reminders job answers only the scheduler', async ({ request }) => {
  const url = '/api/cron/reminders';
  expect((await request.post(url)).status()).toBe(401);
  const wrong = await request.post(url, { headers: { Authorization: 'Bearer wrong-secret' } });
  expect(wrong.status()).toBe(401);
  expect((await request.get(url)).status()).toBe(405);
  const run = await request.post(url, {
    headers: { Authorization: `Bearer ${state().cronSecret}` },
  });
  expect(run.status()).toBe(200);
  expect(await run.json()).toMatchObject({ sent: expect.any(Number), failed: expect.any(Number) });
});

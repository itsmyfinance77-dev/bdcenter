import { expect, test } from '@playwright/test';
import { db, state } from './helpers';

/**
 * The site notice from «تنظیمات سایت»: shown above the header of public
 * pages, closed by the visitor for good, and back once its text changes. The
 * setting is removed afterwards so the other tests see no bar.
 */

const KEY = 'site.announcement';

async function setNotice(text: string) {
  const value = {
    enabled: true,
    text,
    link: '/courses',
    linkLabel: 'دوره‌ها',
    startsAt: null,
    endsAt: null,
    tone: 'warning',
  };
  await db().siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value },
    update: { value },
  });
}

test.afterAll(async () => {
  await db().siteSetting.deleteMany({ where: { key: KEY } });
});

test('the site notice shows, closes for good and returns when edited', async ({ page }) => {
  const text = `مرکز تا ۱۵ فروردین تعطیل است ${state().runId}`;
  await setNotice(text);

  await page.goto('/');
  const bar = page.getByRole('region', { name: 'اطلاعیه' });
  await expect(bar).toContainText(text);
  await expect(bar.getByRole('link', { name: 'دوره‌ها' })).toHaveAttribute('href', '/courses');

  await page.goto('/contact');
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'بستن اطلاعیه' }).click();
  await expect(bar).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(bar).toHaveCount(0);

  await setNotice(`${text} — تمدید شد`);
  await page.goto('/');
  await expect(bar).toContainText('تمدید شد');

  // Not in the admin panel.
  await page.goto('/admin/login');
  await expect(bar).toHaveCount(0);
});

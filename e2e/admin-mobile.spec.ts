import { expect, test } from '@playwright/test';
import { signInAdmin } from './helpers';

/** The panel on a phone: the menu scrolls sideways, the page itself does not. */

test('the admin panel fits a phone screen', async ({ page }) => {
  await signInAdmin(page);
  await page.setViewportSize({ width: 375, height: 800 });
  for (const path of ['/admin', '/admin/articles', '/admin/forms', '/admin/settings']) {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      view: window.innerWidth,
    }));
    expect(widths.page, path).toBeLessThanOrEqual(widths.view);
  }
});

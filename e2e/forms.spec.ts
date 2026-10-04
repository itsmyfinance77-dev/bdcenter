import { expect, test } from '@playwright/test';
import { db, state } from './helpers';

/**
 * The form builder's newer field types in a real browser: several ticked
 * boxes, radio buttons, a Jalali date, a national code and a score, plus a
 * failed submit that keeps what was chosen.
 */

test('a visitor fills a form with the newer field types', async ({ page }) => {
  const slug = `e2e-fields-${state().runId}`;
  await db().formDefinition.create({
    data: {
      slug,
      title: 'فرم آزمون فیلدها',
      status: 'PUBLISHED',
      descriptionHtml: '<p>لطفاً <strong>با دقت</strong> پر کنید.</p>',
      fields: {
        create: [
          {
            key: 'intro',
            label: 'مشخصات',
            type: 'SECTION',
            sortOrder: 1,
            settings: { hint: 'دربارهٔ شرکت' },
          },
          {
            key: 'topics',
            label: 'زمینه‌ها',
            type: 'MULTI_CHOICE',
            isRequired: true,
            sortOrder: 2,
            options: ['صادرات', 'بازاریابی', 'مالی'],
          },
          {
            key: 'kind',
            label: 'نوع شرکت',
            type: 'RADIO',
            isRequired: true,
            sortOrder: 3,
            options: ['دانش‌بنیان', 'فناور'],
          },
          { key: 'when', label: 'تاریخ', type: 'JALALI_DATE', sortOrder: 4 },
          { key: 'code', label: 'کد ملی', type: 'NATIONAL_CODE', isRequired: true, sortOrder: 5 },
          { key: 'score', label: 'امتیاز', type: 'RATING', sortOrder: 6, settings: { scale: 5 } },
        ],
      },
    },
  });

  await page.goto(`/forms/${slug}`);
  await expect(page.getByText('با دقت')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'مشخصات' })).toBeVisible();
  await page.getByLabel('صادرات').check();
  await page.getByLabel('مالی').check();
  await page.getByLabel('فناور').check();
  await page.getByLabel('تاریخ').fill('۱۴۰۵/۰۸/۱۰');
  await page.getByLabel('کد ملی').fill('1234567890');
  await page.getByRole('button', { name: 'ثبت درخواست' }).click();
  await expect(page.getByText('کد ملی معتبر نیست.')).toBeVisible();
  // What was chosen survives the failed submit.
  await expect(page.getByLabel('صادرات')).toBeChecked();
  await expect(page.getByLabel('مالی')).toBeChecked();
  await expect(page.getByLabel('بازاریابی')).not.toBeChecked();

  await page.getByLabel('کد ملی').fill('۰۴۹۹۳۷۰۸۹۹');
  await page.getByRole('group', { name: 'امتیاز' }).getByText('۴', { exact: true }).click();
  await page.getByRole('button', { name: 'ثبت درخواست' }).click();
  await expect(page.getByText('درخواست شما با موفقیت ثبت شد.')).toBeVisible();

  const submission = await db().formSubmission.findFirstOrThrow({
    where: { form: { slug } },
  });
  expect(submission.data).toEqual({
    topics: ['صادرات', 'مالی'],
    kind: 'فناور',
    when: '1405/08/10',
    code: '0499370899',
    score: 4,
  });
});

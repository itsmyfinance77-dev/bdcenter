import { expect, test } from '@playwright/test';
import { db, signInAdmin, signInMember, state, testPhone } from './helpers';

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

test('a members-only form asks to sign in, fills in from the profile and takes one answer', async ({
  page,
}) => {
  const slug = `e2e-members-${state().runId}`;
  await db().formDefinition.create({
    data: {
      slug,
      title: 'فرم ویژهٔ اعضا',
      status: 'PUBLISHED',
      membersOnly: true,
      onePerMember: true,
      thankYouText: 'سپاس؛ پاسخ شما به دست ما رسید.',
      fields: {
        create: [
          {
            key: 'mobile',
            label: 'شمارهٔ همراه',
            type: 'MOBILE',
            isRequired: true,
            sortOrder: 1,
            settings: { prefill: 'phone' },
          },
          { key: 'note', label: 'توضیح', type: 'TEXTAREA', sortOrder: 2 },
        ],
      },
    },
  });

  await page.goto(`/forms/${slug}`);
  await expect(page.getByText('این فرم ویژهٔ اعضای سایت است')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ثبت درخواست' })).toHaveCount(0);

  const phone = testPhone();
  await signInMember(page, phone, `/forms/${slug}`);
  // A new member lands on the profile page first.
  await expect(page).toHaveURL(/\/account\?welcome=1/);
  await page.goto(`/forms/${slug}`);
  await expect(page.getByLabel('شمارهٔ همراه')).toHaveValue(phone);
  await page.getByLabel('توضیح').fill('درخواست آزمایشی');
  await page.getByRole('button', { name: 'ثبت درخواست' }).click();
  await expect(page.getByText('سپاس؛ پاسخ شما به دست ما رسید.')).toBeVisible();

  await page.goto(`/forms/${slug}`);
  await expect(page.getByText('شما قبلاً این فرم را پر کرده‌اید')).toBeVisible();
  const submission = await db().formSubmission.findFirstOrThrow({ where: { form: { slug } } });
  expect(submission.memberId).not.toBeNull();
  expect(submission.data).toMatchObject({ mobile: phone, note: 'درخواست آزمایشی' });
});

test('staff search the answers, take one on, note it and tell the applicant', async ({ page }) => {
  const slug = `e2e-staff-${state().runId}`;
  const mobile = testPhone();
  const fields = [
    { key: 'name', label: 'نام', type: 'TEXT' as const, sortOrder: 1 },
    { key: 'mobile', label: 'همراه', type: 'MOBILE' as const, sortOrder: 2 },
    {
      key: 'topic',
      label: 'زمینه',
      type: 'RADIO' as const,
      sortOrder: 3,
      options: ['صادرات', 'مالی'],
    },
  ];
  const form = await db().formDefinition.create({
    data: { slug, title: 'فرم پیگیری کارمندان', status: 'PUBLISHED', fields: { create: fields } },
  });
  const snapshot = fields.map(({ key, label, type }) => ({ key, label, type }));
  await db().formSubmission.createMany({
    data: [
      { formId: form.id, data: { name: 'نگار آزمون', mobile, topic: 'صادرات' }, fields: snapshot },
      { formId: form.id, data: { name: 'حسن دیگر', topic: 'مالی' }, fields: snapshot },
    ],
  });

  await signInAdmin(page);
  await page.goto(`/admin/forms/${form.id}`);
  await page.getByLabel('جستجو در پاسخ‌ها و یادداشت‌ها').fill('نگار');
  await page.getByRole('button', { name: 'اعمال فیلتر' }).click();
  await expect(page.getByText('۱ درخواست با این فیلترها')).toBeVisible();
  await expect(page.getByText('حسن دیگر')).toHaveCount(0);

  await page.getByRole('link', { name: 'جزئیات، مسئول و یادداشت‌ها' }).click();
  const admin = await db().adminUser.findUniqueOrThrow({ where: { email: state().admin.email } });
  // Retried: a choice made before the page has hydrated is reset by React.
  await expect(async () => {
    await page.getByLabel('مسئول پیگیری').selectOption(admin.id);
    await page.getByRole('button', { name: 'ثبت مسئول' }).click();
    await expect(page.getByText('مسئول پیگیری ثبت شد.')).toBeVisible({ timeout: 2_000 });
    const saved = await db().formSubmission.findFirstOrThrow({
      where: { formId: form.id, assigneeId: admin.id },
    });
    expect(saved.assigneeId).toBe(admin.id);
  }).toPass({ timeout: 20_000 });
  await page.getByLabel('یادداشت تازه').fill('تماس گرفته شد.');
  await page.getByRole('button', { name: 'ثبت یادداشت' }).click();
  await expect(page.getByText('یادداشت ثبت شد.')).toBeVisible();
  await expect(page.getByText('تماس گرفته شد.', { exact: true })).toBeVisible();

  await page.getByRole('combobox', { name: 'وضعیت', exact: true }).selectOption('ACCEPTED');
  await page.getByRole('button', { name: 'ثبت وضعیت' }).click();
  await expect
    .poll(async () => {
      const outbox = (await (await fetch(state().smsOutbox)).json()) as {
        to: string;
        text: string;
      }[];
      return outbox.some((sms) => sms.to === mobile && sms.text.includes('پذیرفته شد'));
    })
    .toBe(true);

  // Only this person's submission is "mine"; the chart counts the filter's answers.
  await page.goto(`/admin/forms/${form.id}/stats?assignee=me`);
  await expect(page.getByText('بر پایهٔ ۱ درخواست')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'زمینه' })).toBeVisible();
});

test('a multi-step form shows a question only when it applies', async ({ page }) => {
  const slug = `e2e-steps-${state().runId}`;
  await db().formDefinition.create({
    data: {
      slug,
      title: 'فرم چندمرحله‌ای',
      status: 'PUBLISHED',
      fields: {
        create: [
          {
            key: 'who',
            label: 'مشخصات',
            type: 'SECTION',
            sortOrder: 1,
            settings: { newPage: true },
          },
          {
            key: 'kind',
            label: 'نوع متقاضی',
            type: 'RADIO',
            isRequired: true,
            sortOrder: 2,
            options: ['حقیقی', 'حقوقی'],
          },
          {
            key: 'company',
            label: 'نام شرکت',
            type: 'TEXT',
            isRequired: true,
            sortOrder: 3,
            settings: { showIf: { field: 'kind', value: 'حقوقی' } },
          },
          {
            key: 'more',
            label: 'توضیحات',
            type: 'SECTION',
            sortOrder: 4,
            settings: { newPage: true },
          },
          { key: 'note', label: 'توضیح', type: 'TEXTAREA', isRequired: true, sortOrder: 5 },
        ],
      },
    },
  });

  await page.goto(`/forms/${slug}`);
  await expect(page.getByText('مرحلهٔ ۱ از ۲: مشخصات')).toBeVisible();
  await expect(page.getByLabel('نام شرکت')).toBeHidden();
  await expect(page.getByRole('button', { name: 'ثبت درخواست' })).toHaveCount(0);

  // Moving on without the required answers is refused on the spot (retried
  // until the page has hydrated: before that the button does nothing).
  await expect(async () => {
    await page.getByRole('button', { name: 'مرحلهٔ بعد' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'نوع متقاضی' })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass({ timeout: 20_000 });

  await page.getByLabel('حقوقی').check();
  await expect(page.getByLabel('نام شرکت')).toBeVisible();
  await page.getByLabel('حقیقی').check();
  await expect(page.getByLabel('نام شرکت')).toBeHidden();
  await page.getByLabel('حقوقی').check();
  await page.getByLabel('نام شرکت').fill('شرکت آزمون');
  await page.getByRole('button', { name: 'مرحلهٔ بعد' }).click();

  await expect(page.getByText('مرحلهٔ ۲ از ۲: توضیحات')).toBeVisible();
  await page.getByLabel('توضیح').fill('متن آزمایشی');
  await page.getByRole('button', { name: 'مرحلهٔ قبل' }).click();
  await expect(page.getByLabel('نام شرکت')).toHaveValue('شرکت آزمون');
  await page.getByRole('button', { name: 'مرحلهٔ بعد' }).click();
  await page.getByRole('button', { name: 'ثبت درخواست' }).click();
  await expect(page.getByText('درخواست شما با موفقیت ثبت شد.')).toBeVisible();

  const submission = await db().formSubmission.findFirstOrThrow({ where: { form: { slug } } });
  expect(submission.data).toEqual({ kind: 'حقوقی', company: 'شرکت آزمون', note: 'متن آزمایشی' });
});

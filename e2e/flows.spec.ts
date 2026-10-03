import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { db, latestCode, signInAdmin, signInMember, state, testPhone } from './helpers';

/**
 * The main journeys, in order, sharing one database: sign-up, enrollment
 * within capacity, booking without double-booking, admin review with SMS
 * notice and certificate, and course editing in the panel.
 */

test.describe.configure({ mode: 'serial' });

const DAY = 24 * 60 * 60 * 1000;
// The e2e database is never wiped: everything this run creates is unique to
// it. Set in beforeAll: the state file only exists once the server started.
let run: string;
let slug: string;
let courseTitle: string;
const phoneA = testPhone();
const phoneB = testPhone();
let memberA: BrowserContext;
let memberB: BrowserContext;
let pageA: Page;
let pageB: Page;
let courseId: string;
let slotId: string;

test.beforeAll(async ({ browser }) => {
  run = state().runId;
  slug = `e2e-excel-${run}`;
  courseTitle = `دوره آزمون اکسل ${run}`;
  const course = await db().course.create({
    data: {
      slug,
      title: courseTitle,
      status: 'PUBLISHED',
      capacity: 1,
      startsAt: new Date(Date.now() + 7 * DAY),
      certificateEnabled: true,
      certificateSignatory: 'امضاکنندهٔ آزمون',
    },
  });
  courseId = course.id;
  const staff = await db().staffProfile.create({
    data: { service: 'CONSULTING', fullName: `مشاور آزمون ${run}`, title: 'مشاور بازاریابی' },
  });
  const startsAt = new Date(Date.now() + 2 * DAY);
  startsAt.setUTCHours(6, 30, 0, 0); // 10:00 Tehran
  const slot = await db().appointmentSlot.create({
    data: { staffId: staff.id, startsAt, endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000) },
  });
  slotId = slot.id;

  memberA = await browser.newContext();
  memberB = await browser.newContext();
  pageA = await memberA.newPage();
  pageB = await memberB.newPage();
});

test.afterAll(async () => {
  await memberA?.close();
  await memberB?.close();
  await db().$disconnect();
});

/** An individual's profile: person type, name, national code, postal code. */
async function completeProfile(page: Page, name: string) {
  await expect(page.getByLabel('نام و نام خانوادگی')).toBeVisible();
  await page.getByLabel('شخص حقیقی').check();
  await page.getByLabel('نام و نام خانوادگی').fill(name);
  await page.getByRole('textbox', { name: 'کد ملی', exact: true }).fill('0499370899');
  await page.getByLabel('کد پستی').fill('8915713456');
  await page.getByRole('button', { name: 'ذخیره' }).click();
}

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

test('a visitor signs up with phone and SMS code and fills in the profile', async () => {
  await signInMember(pageA, phoneA);
  await expect(pageA).toHaveURL(/\/account\?welcome=1/);
  await completeProfile(pageA, 'سارا آزمون');
  // The field shows the typed name at once; wait for the save itself.
  await expect
    .poll(async () => (await db().member.findUnique({ where: { phone: phoneA } }))?.fullName)
    .toBe('سارا آزمون');
  await pageA.reload();
  await expect(pageA.getByLabel('نام و نام خانوادگی')).toHaveValue('سارا آزمون');
});

test('a wrong code is refused', async ({ page }) => {
  await page.goto('/account/login');
  await page.getByLabel('شماره همراه').fill(phoneA);
  await page.getByRole('button', { name: 'دریافت کد' }).click();
  const code = await latestCode(phoneA);
  await page.getByLabel('کد ورود').fill(code === '000000' ? '111111' : '000000');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/account\/login/);
});

test('enrollment respects the capacity', async () => {
  await pageA.goto(`/courses/${slug}`);
  await pageA.getByRole('button', { name: 'ثبت‌نام در این دوره' }).click();
  await expect(pageA.getByRole('status')).toContainText('ثبت‌نام شما انجام شد');

  // The only seat is taken: the second member cannot enroll.
  await signInMember(pageB, phoneB, `/courses/${slug}`);
  await completeProfile(pageB, 'رضا آزمون');
  await expect(pageB).toHaveURL(new RegExp(`/courses/${slug}`));
  await expect(pageB.getByText('ظرفیت تکمیل شد').first()).toBeVisible();
  await expect(pageB.getByRole('button', { name: 'ثبت‌نام در این دوره' })).toHaveCount(0);
});

test('a member books a consulting slot and nobody else can take it', async () => {
  await pageA.goto('/appointments/consulting');
  await expect(pageA.getByText(`مشاور آزمون ${run}`).first()).toBeVisible();
  await pageA.locator(`a[href="/appointments/book/${slotId}"]`).first().click();
  await pageA.getByLabel('موضوع').fill('مشاورهٔ بازاریابی');
  await pageA.getByRole('button', { name: 'ثبت رزرو' }).click();
  await expect(pageA.getByText('نوبت شما رزرو شد').first()).toBeVisible();

  await pageB.goto(`/appointments/book/${slotId}`);
  const taken = pageB.getByText('این زمان را شخص دیگری رزرو کرده است');
  if (!(await taken.isVisible())) {
    await pageB.getByLabel('موضوع').fill('تلاش دوم');
    await pageB.getByRole('button', { name: 'ثبت رزرو' }).click();
  }
  await expect(taken.first()).toBeVisible();
  expect(await db().booking.count({ where: { slotId, status: 'BOOKED' } })).toBe(1);
});

test('the admin marks the enrollment done: SMS notice and certificate', async ({ page }) => {
  await signInAdmin(page);
  await page.goto(`/admin/courses/${courseId}`);
  const row = page.getByRole('row', { name: /سارا آزمون/ });
  await row.getByRole('combobox').selectOption('DONE');
  await row.getByRole('button', { name: 'ثبت وضعیت' }).click();
  await expect(row.getByRole('link', { name: 'گواهی PDF' })).toBeVisible();

  const pdf = await page.request.get(
    (await row.getByRole('link', { name: 'گواهی PDF' }).getAttribute('href'))!,
  );
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');

  // The member was told by SMS (sent after the response).
  await expect
    .poll(async () => {
      const outbox = (await (await fetch(state().smsOutbox)).json()) as {
        to: string;
        text: string;
      }[];
      return outbox.filter((sms) => sms.to === phoneA && sms.text.includes(courseTitle)).length;
    })
    .toBeGreaterThan(0);

  // The member downloads the same certificate from the account page.
  await pageA.goto('/account');
  const link = pageA.getByRole('link', { name: 'دریافت گواهی پایان دوره (PDF)' });
  await expect(link).toBeVisible();
  const own = await pageA.request.get((await link.getAttribute('href'))!);
  expect(own.headers()['content-type']).toBe('application/pdf');
  // ...but not someone else's.
  const enrollmentA = await db().enrollment.findFirstOrThrow({ where: { phone: phoneA } });
  const stranger = await pageB.request.get(`/account/certificates/${enrollmentA.id}`);
  expect(stranger.status()).toBe(404);

  const certificate = await db().certificate.findUniqueOrThrow({
    where: { enrollmentId: enrollmentA.id },
  });
  await pageB.goto(`/certificates?code=${certificate.code.toLowerCase().replace(/-/g, ' ')}`);
  await expect(pageB).toHaveURL(new RegExp(`/certificates/${certificate.code}$`));
  await expect(pageB.getByText('این گواهی معتبر است')).toBeVisible();
  await expect(pageB.getByText('سارا آزمون')).toBeVisible();
});

test('a legal-entity representative waits for approval, then may enroll', async ({
  page,
  browser,
}) => {
  const phone = testPhone();
  const context = await browser.newContext();
  const rep = await context.newPage();
  await signInMember(rep, phone);
  await expect(rep).toHaveURL(/\/account\?welcome=1/);

  await rep.getByLabel('از طرف شخص حقوقی').check();
  await rep.getByLabel('نام و نام خانوادگی').fill('نمایندهٔ آزمون');
  // A wrong national code is refused.
  await rep.getByRole('textbox', { name: 'کد ملی', exact: true }).fill('0499370898');
  await rep.getByLabel('کد پستی').fill('8915713456');
  await rep.getByLabel('نام شخص حقوقی').fill(`شرکت آزمون ${run}`);
  await rep.getByLabel('شناسه ملی شخص حقوقی').fill('10380284790');
  await rep
    .getByLabel('تصویر معرفی‌نامه با سربرگ شرکت')
    .setInputFiles({ name: 'letter.png', mimeType: 'image/png', buffer: PNG_HEADER });
  await rep.getByRole('button', { name: 'ذخیره' }).click();
  await expect(rep.getByText('کد ملی معتبر نیست.')).toBeVisible();

  await rep.getByRole('textbox', { name: 'کد ملی', exact: true }).fill('0499370899');
  await rep
    .getByLabel('تصویر معرفی‌نامه با سربرگ شرکت')
    .setInputFiles({ name: 'letter.png', mimeType: 'image/png', buffer: PNG_HEADER });
  await rep.getByRole('button', { name: 'ذخیره' }).click();
  await expect(rep.getByText('برای تأیید به مدیر سایت فرستاده شد')).toBeVisible();

  const course = await db().course.create({
    data: { slug: `e2e-legal-${run}`, title: `دوره حقوقی ${run}`, status: 'PUBLISHED' },
  });
  await rep.goto(`/courses/${course.slug}`);
  await expect(rep.getByText('در انتظار تأیید مدیر سایت').first()).toBeVisible();
  await expect(rep.getByRole('button', { name: 'ثبت‌نام در این دوره' })).toHaveCount(0);

  // The ADMIN approves; the member hears by SMS and may enroll.
  const member = await db().member.findUniqueOrThrow({ where: { phone } });
  await signInAdmin(page);
  await page.goto('/admin/members?filter=pending');
  await page
    .getByRole('link', {
      // The list shows the number in Persian digits.
      name: phone.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d))),
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/admin/members/${member.id}`));
  await page.getByLabel('تأیید').check();
  await page.getByRole('button', { name: 'ثبت نتیجه و ارسال پیامک به عضو' }).click();
  await expect(page.getByText('عضو تأیید شد.')).toBeVisible();
  await expect
    .poll(async () => {
      const outbox = (await (await fetch(state().smsOutbox)).json()) as {
        to: string;
        text: string;
      }[];
      return outbox.some((sms) => sms.to === phone && sms.text.includes('تأیید شد'));
    })
    .toBe(true);

  await rep.reload();
  await rep.getByRole('button', { name: 'ثبت‌نام در این دوره' }).click();
  await expect(rep.getByRole('status')).toContainText('ثبت‌نام شما انجام شد');
  await context.close();
});

test('the admin writes a formatted page in the editor and publishes it', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/admin/pages/new');
  await page.getByLabel('وضعیت').selectOption('PUBLISHED');
  await page.getByLabel('عنوان').fill(`صفحه آزمون ${run}`);
  await page.getByLabel('نامک (آدرس صفحه)').fill(`e2e-page-${run}`);
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type('متن پررنگ آزمون');
  await page.keyboard.press('Shift+Home');
  await page.getByRole('button', { name: 'پررنگ' }).click();
  await page.getByLabel('اندازهٔ قلم').selectOption('24px');
  // Put the cursor after the text: a table would replace the selection.
  await editor.locator('p').first().click();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'افزودن جدول ۳ در ۳' }).click();
  await page.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شد');

  await page.goto(`/pages/e2e-page-${run}`);
  const body = page.locator('.rich-content');
  await expect(body.locator('strong')).toHaveText('متن پررنگ آزمون');
  await expect(body.locator('span[style*="font-size:24px"]')).toBeVisible();
  await expect(body.locator('table')).toHaveCount(1);
});

test('the admin creates and publishes a course from the panel', async ({ page }) => {
  await signInAdmin(page);
  await page.goto('/admin/courses/new');
  await page.getByLabel('وضعیت').selectOption('PUBLISHED');
  await page.getByLabel('عنوان').fill(`دوره ساخته‌شده در آزمون ${run}`);
  await page.getByLabel('مدرس').fill('مدرس آزمون');
  await page.getByRole('button', { name: 'ذخیره' }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/[^/]+\?saved=1/);
  await expect(page.getByRole('status')).toContainText('ذخیره شد');

  await page.goto('/courses');
  await expect(page.getByText(`دوره ساخته‌شده در آزمون ${run}`)).toBeVisible();
});

test('admin pages load', async ({ page }) => {
  await signInAdmin(page);
  for (const [path, heading] of [
    ['/admin/stats', 'آمار'],
    ['/admin/system', 'وضعیت سامانه'],
    ['/admin/audit', 'گزارش فعالیت'],
    ['/admin/help', 'راهنمای پنل مدیریت'],
    ['/admin/appointments', null],
    ['/admin/members', null],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    if (heading) await expect(page.locator('h1').first()).toContainText(heading);
  }
});

test('an ADMIN sets a new password for a colleague, who then picks their own', async ({
  page,
  browser,
}) => {
  const email = `e2e-editor-${run}@bdcenter.test`;
  await db().adminUser.create({
    data: { email, fullName: 'ویراستار آزمون', passwordHash: 'unused', role: 'EDITOR' },
  });

  await signInAdmin(page);
  await page.goto('/admin/users');
  const row = page.getByRole('row').filter({ hasText: email });
  await row.getByText('تعیین رمز تازه').click();
  await row.getByRole('button', { name: 'ثبت رمز تازه' }).click();
  const shown = row.locator('code');
  await expect(shown).toBeVisible();
  const password = (await shown.textContent())!.trim();
  expect(password).toMatch(/^[a-zA-Z2-9]{4}(-[a-zA-Z2-9]{4}){3}$/);

  const colleague = await browser.newContext();
  const other = await colleague.newPage();
  await other.goto('/admin/login');
  await other.getByLabel('ایمیل').fill(email);
  await other.getByLabel('رمز عبور').fill(password);
  await other.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(other).toHaveURL(/\/admin\/?$/);
  const notice = other.getByText('رمز عبور شما را شخص دیگری تعیین کرده است');
  await expect(notice).toBeVisible();

  await other.goto('/admin/account');
  await other.getByLabel('رمز عبور فعلی').fill(password);
  await other.getByLabel('رمز عبور جدید').fill(`own-password-${run}`);
  await other.getByRole('button', { name: 'تغییر رمز' }).click();
  await expect(other.getByText('رمز عبور تغییر کرد')).toBeVisible();
  await expect(notice).toHaveCount(0);
  await colleague.close();
});

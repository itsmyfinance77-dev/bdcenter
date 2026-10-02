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

async function completeProfile(page: Page, name: string) {
  await expect(page.getByLabel('نام و نام خانوادگی')).toBeVisible();
  await page.getByLabel('نام و نام خانوادگی').fill(name);
  await page.getByRole('button', { name: 'ذخیره' }).click();
}

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
    ['/admin/appointments', null],
    ['/admin/members', null],
  ] as const) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    if (heading) await expect(page.locator('h1').first()).toContainText(heading);
  }
});

/**
 * Test accounts for every kind of site user, for manual testing on the
 * development database (with SMS_PROVIDER="sandbox", see
 * src/modules/messaging/sandbox.ts). Usage:
 *
 *   npm run sandbox:users                   (re)create the accounts, new passwords
 *   npm run sandbox:users -- --limits-only  only lift the sign-in rate limits
 *
 * Writes sandbox/test-users.html (git-ignored): who is who, the passwords,
 * where to sign in and what to test. Each run gives the admin accounts new
 * random passwords, turns their two-step login off and signs every test
 * account out. Refuses to touch a database that is not on this computer.
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import sharp from 'sharp';
import { Prisma, prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/modules/auth/password';
import { deleteStoredFile, storedFileSchema, storeUpload } from '../src/modules/files/service';

type TestAdmin = {
  email: string;
  fullName: string;
  role: 'ADMIN' | 'EDITOR';
  isActive: boolean;
  mustChangePassword: boolean;
  label: string;
  purpose: string;
};

type TestMember = {
  phone: string;
  fullName: string | null;
  personType: 'INDIVIDUAL' | 'LEGAL' | null;
  companyName: string | null;
  legalNationalId: string | null;
  approval: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED';
  isActive: boolean;
  label: string;
  purpose: string;
};

/** A test کد ملی: nine chosen digits plus the matching check digit. */
function nationalCodeFor(nine: string): string {
  const sum = [...nine].reduce((total, digit, i) => total + Number(digit) * (10 - i), 0);
  const remainder = sum % 11;
  return nine + String(remainder < 2 ? remainder : 11 - remainder);
}

/** A test شناسه ملی: ten chosen digits plus the matching check digit. */
function legalIdFor(ten: string): string {
  const digits = [...ten].map(Number);
  const offset = digits[9]! + 2;
  const weights = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17];
  const remainder = weights.reduce((t, w, i) => t + (digits[i]! + offset) * w, 0) % 11;
  return ten + String(remainder === 10 ? 0 : remainder);
}

const TEST_COMPANY_ID = legalIdFor('1099000000');
const TEST_POSTAL_CODE = '8915713456';

const admins: TestAdmin[] = [
  {
    email: 'admin@sandbox.test',
    fullName: 'مدیر کل آزمایشی',
    role: 'ADMIN',
    isActive: true,
    mustChangePassword: false,
    label: 'مدیر کل',
    purpose: 'همهٔ بخش‌های پنل، از جمله اعضای سایت، کاربران پنل، گزارش فعالیت و وضعیت سامانه.',
  },
  {
    email: 'editor@sandbox.test',
    fullName: 'ویراستار آزمایشی',
    role: 'EDITOR',
    isActive: true,
    mustChangePassword: false,
    label: 'ویراستار',
    purpose:
      'محتوا و درخواست‌ها. باید ببینید که منوهای «اعضای سایت»، «کاربران پنل»، «گزارش فعالیت» و «وضعیت سامانه» را ندارد و ساخت فرم برایش بسته است.',
  },
  {
    email: 'newpass@sandbox.test',
    fullName: 'کاربر با رمز موقت',
    role: 'EDITOR',
    isActive: true,
    mustChangePassword: true,
    label: 'ویراستار با رمز موقت',
    purpose:
      'مثل کارمندی که مدیر برایش رمز گذاشته: بالای پنل پیام «رمز را عوض کنید» می‌بیند تا رمز را در «حساب من و امنیت» عوض کند.',
  },
  {
    email: 'disabled@sandbox.test',
    fullName: 'ویراستار غیرفعال',
    role: 'EDITOR',
    isActive: false,
    mustChangePassword: false,
    label: 'ویراستار غیرفعال',
    purpose: 'نباید بتواند وارد شود (پیام «ایمیل یا رمز عبور نادرست است»).',
  },
];

// The 0990 prefix: the DB tests remove their own members by other prefixes.
const members: TestMember[] = [
  {
    phone: '09900000001',
    fullName: 'عضو آزمایشی یک',
    personType: 'INDIVIDUAL',
    companyName: null,
    legalNationalId: null,
    approval: 'NOT_REQUIRED',
    isActive: true,
    label: 'شخص حقیقی، پروفایل کامل',
    purpose: 'ثبت‌نام در دوره، گرفتن نوبت، درخواست مشاوره و پیگیری آن‌ها در «حساب کاربری».',
  },
  {
    phone: '09900000002',
    fullName: null,
    personType: null,
    companyName: null,
    legalNationalId: null,
    approval: 'NOT_REQUIRED',
    isActive: true,
    label: 'عضو با پروفایل ناقص',
    purpose:
      'پس از ورود باید از او خواسته شود نوع ثبت‌نام، نام، کد ملی و کد پستی را کامل کند؛ تا آن موقع نمی‌تواند در دوره ثبت‌نام کند یا نوبت بگیرد.',
  },
  {
    phone: '09900000003',
    fullName: 'عضو غیرفعال',
    personType: 'INDIVIDUAL',
    companyName: null,
    legalNationalId: null,
    approval: 'NOT_REQUIRED',
    isActive: false,
    label: 'عضو غیرفعال',
    purpose: 'کد می‌گیرد، اما پس از وارد کردن کد پیام «این حساب غیرفعال شده است» را می‌بیند.',
  },
  {
    phone: '09900000004',
    fullName: 'نمایندهٔ آزمایشی یک',
    personType: 'LEGAL',
    companyName: 'شرکت آزمایشی نمونه',
    legalNationalId: TEST_COMPANY_ID,
    approval: 'PENDING',
    isActive: true,
    label: 'از طرف شخص حقوقی، در انتظار تأیید',
    purpose:
      'پیام «در انتظار تأیید» را می‌بیند و نمی‌تواند ثبت‌نام کند یا نوبت بگیرد. مدیر کل او را در «اعضای سایت» تأیید یا رد می‌کند؛ نتیجه پیامک می‌شود.',
  },
  {
    phone: '09900000005',
    fullName: 'نمایندهٔ آزمایشی دو',
    personType: 'LEGAL',
    companyName: 'شرکت آزمایشی نمونه',
    legalNationalId: TEST_COMPANY_ID,
    approval: 'APPROVED',
    isActive: true,
    label: 'از طرف همان شخص حقوقی، تأییدشده',
    purpose:
      'نفر دوم همان شرکت (چند نفر می‌توانند از طرف یک شخص حقوقی ثبت‌نام کنند). تأیید شده است و همهٔ خدمات را دارد.',
  },
];

function assertLocalDatabase() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('Refusing to run with NODE_ENV=production.');
  const url = process.env.DATABASE_URL ?? '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error('DATABASE_URL is not set or not a URL.');
  }
  if (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) {
    throw new Error(
      `Refusing to create test accounts on a database at ${host} (not this computer).`,
    );
  }
}

async function liftLimits() {
  const phones = members.map((m) => m.phone);
  const { count } = await prisma.rateLimitBucket.deleteMany({
    where: {
      OR: [
        { key: { startsWith: 'otp-send:' } },
        { key: { startsWith: 'otp-verify:' } },
        { key: { startsWith: 'admin-login:' } },
      ],
    },
  });
  await prisma.otpChallenge.deleteMany({ where: { phone: { in: phones } } });
  return count;
}

function password() {
  return randomBytes(12).toString('base64url');
}

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fa = (text: string) => text.replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d)));

function lanAddresses(port: string) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'))
    .map((a) => `http://${a!.address}:${port}`);
}

function renderHtml(passwords: Map<string, string>, generatedAt: Date) {
  const sites: [string, string][] = [
    ['سرور توسعه روی همین کامپیوتر', 'http://localhost:3010'],
    ['پیش‌نمایش (نسخهٔ نهایی) روی همین کامپیوتر', 'http://localhost:3020'],
    ...lanAddresses('3020').map((url): [string, string] => [
      'پیش‌نمایش از کامپیوترها و گوشی‌های شبکهٔ داخلی',
      url,
    ]),
  ];
  const link = (url: string) => `<a href="${url}" dir="ltr">${url}</a>`;

  const adminRows = admins
    .map(
      (a) => `<tr><td><b>${a.label}</b></td><td dir="ltr" class="mono">${a.email}</td>
<td dir="ltr" class="mono secret">${escape(passwords.get(a.email) ?? '')}</td><td>${a.purpose}</td></tr>`,
    )
    .join('\n');
  const memberRows = members
    .map(
      (m) => `<tr><td><b>${m.label}</b></td><td dir="ltr" class="mono">${fa(m.phone)}</td>
<td>${m.fullName ?? '—'}${m.companyName ? `<br><span class="muted">${m.companyName}</span>` : ''}</td><td>${m.purpose}</td></tr>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>کاربران آزمایشی سایت مرکز توسعه کسب‌وکار</title>
<style>
  :root { --ink:#0e1a33; --ink2:#3a4660; --line:#e1e6ee; --bg:#f4f6fa; --primary:#1450c8; --warn:#9a5b00; --warnbg:#fff6e5; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.9 Vazirmatn, Tahoma, sans-serif; }
  main { max-width:1000px; margin:0 auto; padding:24px 16px 64px; }
  h1 { font-size:24px; margin:0 0 4px; } h2 { font-size:19px; margin:32px 0 8px; } h3 { font-size:16px; margin:20px 0 4px; }
  section { background:#fff; border:1px solid var(--line); border-radius:16px; padding:8px 20px 16px; margin-top:16px; }
  table { width:100%; border-collapse:collapse; font-size:14px; } th, td { border-bottom:1px solid var(--line); padding:8px 6px; text-align:right; vertical-align:top; }
  th { color:var(--ink2); font-weight:600; } .mono { font-family:ui-monospace, Consolas, monospace; white-space:nowrap; }
  .secret { background:#f0f4fb; border-radius:6px; padding:2px 8px; user-select:all; }
  .note { background:var(--warnbg); border:1px solid #f0d9a8; border-radius:12px; padding:10px 16px; }
  .muted { color:var(--ink2); font-size:13px; } a { color:var(--primary); } ol, ul { padding-right:22px; margin:4px 0; }
  .table-wrap { overflow-x:auto; }
</style>
</head>
<body><main>
<h1>کاربران آزمایشی سایت</h1>
<p class="muted">ساخته‌شده در ${fa(generatedAt.toLocaleString('fa-IR-u-nu-latn', { timeZone: 'Asia/Tehran' }))} با دستور <span class="mono" dir="ltr">npm run sandbox:users</span>.
هر بار اجرای دوبارهٔ این دستور رمزهای تازه می‌سازد و این فایل را به‌روز می‌کند.</p>

<p class="note"><b>فقط برای آزمایش.</b> این حساب‌ها روی پایگاه دادهٔ آزمایشی همین کامپیوتر ساخته شده‌اند و روی سایت واقعی وجود ندارند.
این فایل رمز عبور دارد؛ آن را برای کسی که قرار نیست سایت را آزمایش کند نفرستید.</p>

<section>
<h2>نشانی‌های سایت</h2>
<table><tr><th>کجا</th><th>نشانی</th><th>پنل مدیریت</th></tr>
${sites.map(([where, url]) => `<tr><td>${where}</td><td>${link(url)}</td><td>${link(`${url}/admin`)}</td></tr>`).join('\n')}
</table>
<p class="muted">سرور توسعه فقط وقتی کار می‌کند که روشن باشد (<span class="mono" dir="ltr">npm run dev</span>).
پیش‌نمایش در پنجرهٔ «BDC site» اجرا می‌شود و چون HTTPS ندارد فقط برای آزمایش است.</p>
</section>

<section>
<h2>انواع کاربران سایت</h2>
<table>
<tr><th>نوع کاربر</th><th>چطور وارد می‌شود</th><th>به چه چیزهایی دسترسی دارد</th></tr>
<tr><td><b>بازدیدکننده</b></td><td>بدون ورود</td><td>همهٔ صفحه‌های عمومی: خانه، درباره ما، خدمات، اخبار و رویدادها، تقویم، دوره‌ها، جستجو، تماس با ما، فرم‌ها (مثل میز خدمت)، درخواست مشاوره و استعلام گواهی‌نامه.</td></tr>
<tr><td><b>عضو سایت — شخص حقیقی</b></td><td>شمارهٔ همراه + کد پیامکی (بدون رمز) در <span class="mono" dir="ltr">/account/login</span></td><td>همهٔ کارهای بازدیدکننده، به‌علاوه: «حساب کاربری» و پروفایل، ثبت‌نام در دوره‌ها و انصراف، گرفتن نوبت مشاوره و میز خدمت، پیگیری درخواست‌های مشاوره، دریافت گواهی‌نامهٔ دوره. پیش از آن باید نام، کد ملی و کد پستی را کامل کند (تصویر کارت ملی اختیاری است، مگر مدیر کل آن را اجباری کند).</td></tr>
<tr><td><b>عضو سایت — از طرف شخص حقوقی</b></td><td>مثل شخص حقیقی</td><td>همان دسترسی‌ها، ولی علاوه بر کد ملی خودش، نام و شناسه ملی شخص حقوقی و تصویر معرفی‌نامه با سربرگ شرکت را بارگذاری می‌کند و تا <b>تأیید مدیر کل</b> نمی‌تواند در دوره ثبت‌نام کند یا نوبت بگیرد. چند نفر می‌توانند از طرف یک شخص حقوقی ثبت‌نام کنند.</td></tr>
<tr><td><b>ویراستار</b> (کارمند)</td><td>ایمیل + رمز عبور در <span class="mono" dir="ltr">/admin</span> (و در صورت فعال بودن، کد برنامهٔ احراز هویت)</td><td>داشبورد، آمار، اخبار و رویدادها، دوره‌ها و ثبت‌نام‌ها، صفحه‌ها، پیوندها، نوبت‌دهی، درخواست‌های مشاوره، پیام‌های تماس، درخواست‌های فرم‌ها، حساب من، راهنما، صندوق پیامک آزمایشی.</td></tr>
<tr><td><b>مدیر کل</b></td><td>مثل ویراستار</td><td>همهٔ کارهای ویراستار، به‌علاوه: ساخت و ویرایش فرم‌ها، اعضای سایت، کاربران پنل (افزودن، غیرفعال کردن، تعیین رمز تازه، بازنشانی ورود دومرحله‌ای)، گزارش فعالیت، وضعیت سامانه.</td></tr>
</table>
<p class="muted">ورود به پنل مدیریت با پیامک نیست؛ با ایمیل و رمز عبور است و برای امنیت بیشتر می‌توان «ورود دومرحله‌ای» با برنامهٔ احراز هویت گوشی را فعال کرد. پیامک فقط برای ورود اعضای سایت و اطلاع‌رسانی وضعیت درخواست‌ها به کار می‌رود.</p>
</section>

<section>
<h2>حساب‌های پنل مدیریت</h2>
<div class="table-wrap"><table>
<tr><th>نقش</th><th>ایمیل</th><th>رمز عبور</th><th>برای آزمایش چه چیزی</th></tr>
${adminRows}
</table></div>
<p class="muted">ورود دومرحله‌ای را می‌توانید با هر کدام در «حساب من و امنیت» فعال کنید (Google Authenticator یا Microsoft Authenticator). اجرای دوبارهٔ دستور آن را خاموش می‌کند.
پس از ۵ رمز اشتباه، ورود ۱۵ دقیقه بسته می‌شود.</p>
</section>

<section>
<h2>اعضای سایت (ورود با کد پیامکی)</h2>
<div class="table-wrap"><table>
<tr><th>نوع</th><th>شمارهٔ همراه</th><th>نام / شخص حقوقی</th><th>برای آزمایش چه چیزی</th></tr>
${memberRows}
<tr><td><b>عضو تازه</b></td><td>هر شمارهٔ دیگری که با ۰۹ شروع شود</td><td>—</td><td>ثبت‌نام: با اولین ورود، حساب ساخته می‌شود.</td></tr>
</table></div>
<h3>کد ورود را از کجا ببینم؟</h3>
<ol>
<li>در سایت «ورود / ثبت‌نام» را بزنید، شمارهٔ همراه را وارد کنید و «دریافت کد» را بزنید.</li>
<li>در یک زبانهٔ دیگر مرورگر، با یکی از حساب‌های پنل وارد شوید و از منو <b>«صندوق پیامک آزمایشی»</b> را باز کنید (<span class="mono" dir="ltr">/admin/sms-sandbox</span>). کد ۶ رقمی با حروف درشت آنجاست؛ صفحه هر چند ثانیه خودش به‌روز می‌شود.</li>
<li>کد را در سایت وارد کنید. هر کد ۲ دقیقه اعتبار دارد و فقط یک بار کار می‌کند.</li>
</ol>
<p class="muted">پیامک‌های اطلاع‌رسانی (مثلاً «ثبت‌نام شما پذیرفته شد») هم در همین صندوق دیده می‌شوند. هیچ پیامکی واقعاً فرستاده نمی‌شود.
محدودیت‌ها: هر شماره ۳ کد در ۱۵ دقیقه، هر نشانی اینترنتی ۱۰ کد در ساعت، ۵ کد اشتباه در ۱۵ دقیقه. اگر به محدودیت خوردید:
<span class="mono" dir="ltr">npm run sandbox:users -- --limits-only</span> (رمزها عوض نمی‌شوند).</p>
</section>

<section>
<h2>سناریوهای پیشنهادی آزمایش</h2>
<h3>۱. مدیر کل: آماده کردن داده‌ها</h3>
<ul>
<li>«اخبار و رویدادها»: یک خبر و یک رویداد بسازید، تصویر جلد بگذارید، منتشر کنید و در سایت ببینید.</li>
<li>«دوره‌های آموزشی»: یک دوره با ظرفیت ۲ نفر بسازید و منتشر کنید (گواهی‌نامه را هم روشن کنید).</li>
<li>«نوبت‌دهی»: یک مشاور بسازید (با شمارهٔ همراه و عکس) و برای چند روز آینده چند نوبت تعریف کنید. وقتی عضوی نوبت بگیرد یا لغو کند، پیامک تاریخ و ساعت به شمارهٔ مشاور هم می‌آید (در صندوق آزمایشی ببینید).</li>
<li>«صفحه‌ها»: یک صفحهٔ تازه با ویرایشگر کامل بسازید (فونت، اندازه، فهرست، جدول، تصویر و پیوند) و در سایت ببینید.</li>
<li>«صفحه‌ها» و «پیوندها»: متن یک صفحه یا یک پیوند را عوض کنید و نتیجه را در سایت ببینید.</li>
</ul>
<h3>۲. عضو سایت</h3>
<ul>
<li>با <span class="mono" dir="ltr">${fa('09900000001')}</span> وارد شوید، در دوره ثبت‌نام کنید و یک نوبت مشاوره بگیرید.</li>
<li>دوباره همان نوبت را با عضو دیگری بگیرید: نباید بشود (هر نوبت فقط برای یک نفر است).</li>
<li>یک درخواست مشاوره بفرستید و در «حساب کاربری» وضعیتش را ببینید.</li>
<li>با <span class="mono" dir="ltr">${fa('09900000002')}</span> و <span class="mono" dir="ltr">${fa('09900000003')}</span> و یک شمارهٔ تازه هم ورود را امتحان کنید. کد اشتباه هم وارد کنید.</li>
<li>با یک شمارهٔ تازه «از طرف شخص حقوقی» ثبت‌نام کنید: شناسه ملی <span class="mono" dir="ltr">${fa(TEST_COMPANY_ID)}</span> (شرکت آزمایشی)، کد ملی آزمایشی <span class="mono" dir="ltr">${fa(nationalCodeFor('009900000'))}</span>، کد پستی <span class="mono" dir="ltr">${fa(TEST_POSTAL_CODE)}</span> و یک عکس به‌جای معرفی‌نامه. کد ملی یا شناسهٔ اشتباه را هم امتحان کنید.</li>
<li>با <span class="mono" dir="ltr">${fa('09900000004')}</span> وارد شوید: پیام «در انتظار تأیید» را می‌بیند.</li>
</ul>
<h3>۳. ویراستار</h3>
<ul>
<li>ثبت‌نام عضو در دوره را «پذیرفته شده» و بعد «انجام شده» کنید؛ پیامک اطلاع‌رسانی باید در صندوق آزمایشی بیاید و عضو در حساب خود گواهی‌نامه را دانلود کند.</li>
<li>درخواست مشاوره را بررسی کنید، فهرست ثبت‌نام‌ها را CSV بگیرید و پیام‌های تماس را ببینید.</li>
<li>مطمئن شوید منوهای مخصوص مدیر کل را نمی‌بیند.</li>
</ul>
<h3>۴. مدیر کل: کاربران و امنیت</h3>
<ul>
<li>«اعضای سایت»: عضو یک را غیرفعال کنید؛ باید فوراً از سایت خارج شود. دوباره فعالش کنید.</li>
<li>«اعضای سایت» ← «در انتظار تأیید»: نمایندهٔ آزمایشی یک را باز کنید، معرفی‌نامه را ببینید و او را تأیید یا با نوشتن دلیل رد کنید. پیامک نتیجه در صندوق آزمایشی می‌آید.</li>
<li>بالای «اعضای سایت» تصویر کارت ملی را «اجباری» کنید و ببینید عضو یک دیگر نمی‌تواند ثبت‌نام کند تا تصویر را بارگذاری کند. بعد دوباره «اختیاری» کنید.</li>
<li>«کاربران پنل»: برای ویراستار «تعیین رمز تازه» بزنید و با رمز تازه وارد شوید.</li>
<li>«گزارش فعالیت»: کارهای بالا باید ثبت شده باشند. «وضعیت سامانه» و «آمار» را هم ببینید.</li>
</ul>
<h3>۵. بازدیدکننده (بدون ورود)</h3>
<ul>
<li>همهٔ صفحه‌ها را روی گوشی هم باز کنید، جستجو کنید، فرم «تماس با ما» و «میز خدمت» را بفرستید (با پیوست) و کد گواهی‌نامه را استعلام کنید.</li>
<li>بخش‌های ادمین و «حساب کاربری» بدون ورود نباید باز شوند.</li>
</ul>
</section>
</main></body></html>
`;
}

/** A plain image standing in for an introduction letter on company letterhead. */
async function sampleLetter(): Promise<File> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100">
<rect width="100%" height="100%" fill="#ffffff"/><rect x="40" y="40" width="720" height="90" fill="#1450c8"/>
<text x="400" y="560" font-size="48" text-anchor="middle" fill="#3a4660">SAMPLE LETTER</text></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new File([new Uint8Array(png)], 'sample-letter.png', { type: 'image/png' });
}

async function main() {
  const { values } = parseArgs({ options: { 'limits-only': { type: 'boolean', default: false } } });
  assertLocalDatabase();

  if (values['limits-only']) {
    const count = await liftLimits();
    console.log(`Sign-in rate limits lifted (${count} buckets removed).`);
    return;
  }

  const passwords = new Map<string, string>();
  for (const admin of admins) {
    const plain = password();
    passwords.set(admin.email, plain);
    const data = {
      fullName: admin.fullName,
      role: admin.role,
      isActive: admin.isActive,
      mustChangePassword: admin.mustChangePassword,
      passwordHash: await hashPassword(plain),
      totpSecret: null,
      totpPendingSecret: null,
      totpEnabledAt: null,
      totpLastStep: null,
      recoveryCodeHashes: [],
    };
    await prisma.adminUser.upsert({
      where: { email: admin.email },
      create: { email: admin.email, ...data },
      update: { ...data, sessionVersion: { increment: 1 } },
    });
  }

  // Each run stores a fresh sample letter; the previous run's copy is removed.
  const previous = await prisma.member.findMany({
    where: { phone: { in: members.map((m) => m.phone) } },
    select: { letterFile: true },
  });
  for (const row of previous) {
    const old = storedFileSchema.safeParse(row.letterFile);
    if (old.success) await deleteStoredFile(old.data.storageKey);
  }
  const letter = await storeUpload('members/letters', await sampleLetter());
  for (const [index, member] of members.entries()) {
    const complete = member.personType !== null;
    const data = {
      fullName: member.fullName,
      personType: member.personType,
      nationalId: complete ? nationalCodeFor(`00990000${index}`) : null,
      postalCode: complete ? TEST_POSTAL_CODE : null,
      companyName: member.companyName,
      legalNationalId: member.legalNationalId,
      letterFile: member.personType === 'LEGAL' ? letter : Prisma.DbNull,
      approval: member.approval,
      approvalNote: null,
      isActive: member.isActive,
    };
    await prisma.member.upsert({
      where: { phone: member.phone },
      create: { phone: member.phone, ...data },
      update: { ...data, sessionVersion: { increment: 1 } },
    });
  }
  await liftLimits();

  const dir = join(process.cwd(), 'sandbox');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'test-users.html');
  writeFileSync(file, renderHtml(passwords, new Date()));

  console.log(`Test accounts ready: ${admins.length} panel users, ${members.length} members.`);
  console.log(`Details and passwords: ${file}`);
  if (process.env.SMS_PROVIDER?.trim() !== 'sandbox') {
    console.log(
      'Note: set SMS_PROVIDER="sandbox" in .env to see sign-in codes in the admin panel.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

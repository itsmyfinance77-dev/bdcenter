import QRCode from 'qrcode';
import { AdminHeading, buttonClass } from '@/components/admin/ui';
import { formatDate, formatNumber } from '@/lib/format';
import { requireAdmin } from '@/modules/auth/service';
import { pendingTotpSetup, twoFactorStatus } from '@/modules/auth/two-factor';
import { PasswordForm } from './password-form';
import { startTwoFactorAction } from './two-factor-actions';
import { ConfirmSetupForm, DisableForm, RegenerateCodesForm } from './two-factor-forms';

export const metadata = { title: 'حساب من' };

const card = 'space-y-4 rounded-panel border border-line bg-white p-6';

export default async function AccountPage() {
  const admin = await requireAdmin();
  const status = await twoFactorStatus(admin.id);
  const pending = status.setupPending ? await pendingTotpSetup(admin.id) : null;
  const qr = pending ? await QRCode.toDataURL(pending.uri, { margin: 1, width: 200 }) : null;

  return (
    <>
      <AdminHeading title="حساب من" />
      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="password-heading" className="max-w-md">
          <h2 id="password-heading" className="mb-3 font-bold text-brand-900">
            تغییر رمز عبور
          </h2>
          <PasswordForm />
        </section>

        <section aria-labelledby="two-factor-heading" className={card}>
          <h2 id="two-factor-heading" className="font-bold text-brand-900">
            ورود دومرحله‌ای
          </h2>
          {!status.available ? (
            <p className="text-sm text-danger">
              کلید رمزنگاری سرور (DATA_ENCRYPTION_KEY) تنظیم نشده است؛ این امکان فعلاً در دسترس
              نیست.
            </p>
          ) : status.enabled ? (
            <>
              <p className="text-sm text-success">
                فعال است (از {formatDate(status.enabledAt!)}). کدهای بازیابی باقی‌مانده:{' '}
                {formatNumber(status.recoveryCodesLeft)}
              </p>
              <details className="rounded-card border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                  ساخت کدهای بازیابی تازه
                </summary>
                <div className="mt-3">
                  <RegenerateCodesForm />
                </div>
              </details>
              <details className="rounded-card border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold text-danger">
                  غیرفعال کردن
                </summary>
                <div className="mt-3">
                  <DisableForm />
                </div>
              </details>
            </>
          ) : pending && qr ? (
            <>
              <ol className="list-[persian] space-y-1 ps-5 text-sm leading-7 text-ink-2">
                <li>برنامهٔ احراز هویت (مثل Google Authenticator) را روی گوشی باز کنید.</li>
                <li>این کد QR را اسکن کنید، یا کلید زیر را دستی وارد کنید.</li>
                <li>کد ۶ رقمی‌ای که برنامه نشان می‌دهد را وارد کنید.</li>
              </ol>
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
              <img
                src={qr}
                alt="کد QR برای افزودن حساب به برنامهٔ احراز هویت"
                width={200}
                height={200}
                className="rounded-card border border-line"
              />
              <p dir="ltr" className="font-mono text-sm break-all text-ink">
                {pending.secret.replace(/(.{4})/g, '$1 ').trim()}
              </p>
              <ConfirmSetupForm />
            </>
          ) : (
            <>
              <p className="text-sm leading-7 text-ink-2">
                با فعال کردن این گزینه، ورود به پنل علاوه بر رمز عبور به کد ۶ رقمی برنامهٔ احراز
                هویت گوشی نیاز دارد؛ اگر رمز شما لو برود، حساب همچنان امن می‌ماند.
              </p>
              <form action={startTwoFactorAction}>
                <button type="submit" className={buttonClass}>
                  فعال‌سازی ورود دومرحله‌ای
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}

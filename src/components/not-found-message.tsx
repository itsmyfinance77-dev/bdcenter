import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { PageBody } from '@/components/site/page-body';

/** 404 inside the public site chrome (BDC Yazd design). */
export function NotFoundMessage() {
  return (
    <>
      <PageHeader title="صفحه پیدا نشد" />
      <PageBody>
        <div className="flex max-w-[560px] flex-col items-start gap-4">
          <p className="text-[17px] leading-loose text-ink-2">
            صفحه‌ای با این نشانی وجود ندارد یا جابه‌جا شده است.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center rounded-control bg-primary px-[22px] font-bold text-white hover:bg-primary-hover hover:text-white"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </PageBody>
    </>
  );
}

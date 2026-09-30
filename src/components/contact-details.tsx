import { siteInfo } from '@/content/site';
import { toPersianDigits } from '@/lib/format';

/** The center's contact lines. Unconfirmed items (OQ-BD-02, OQ-BD-03) show "—". */
export function ContactDetails({ className }: { className?: string }) {
  const { address, postalCode, phone, phoneExtension, email } = siteInfo.contact;
  return (
    <ul className={className}>
      <li>آدرس: {address}</li>
      <li>کدپستی: {postalCode ? toPersianDigits(postalCode) : '—'}</li>
      <li>
        تلفن: <span dir="ltr">{toPersianDigits(phone)}</span>
        {phoneExtension ? ` داخلی ${toPersianDigits(phoneExtension)}` : ''}
      </li>
      <li>
        ایمیل:{' '}
        {email ? (
          <a href={`mailto:${email}`} dir="ltr" className="underline">
            {email}
          </a>
        ) : (
          '—'
        )}
      </li>
    </ul>
  );
}

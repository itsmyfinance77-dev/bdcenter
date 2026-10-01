import type { Metadata } from 'next';
import { anjoman, vazirmatn } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3010'),
  title: {
    default: 'مرکز توسعه کسب‌وکار اتاق یزد',
    template: '%s | مرکز توسعه کسب‌وکار اتاق یزد',
  },
  description:
    'مرکز توسعه کسب‌وکار اتاق بازرگانی، صنایع، معادن و کشاورزی یزد — آموزش، مشاوره، رویدادهای فناورانه و اتصال شرکت‌های دانش‌بنیان به صنایع.',
  icons: { icon: '/brand/bdc-logo.png', apple: '/brand/bdc-logo.png' },
};

export const viewport = { themeColor: '#081a44' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fa"
      dir="rtl"
      // The home intro sets data-intro before React hydrates (src/components/home/intro.tsx).
      suppressHydrationWarning
      className={`${vazirmatn.variable} ${anjoman.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

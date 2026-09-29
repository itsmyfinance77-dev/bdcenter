import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'مرکز توسعه کسب‌وکار اتاق یزد',
    template: '%s | مرکز توسعه کسب‌وکار اتاق یزد',
  },
  description:
    'مرکز توسعه کسب‌وکار اتاق بازرگانی، صنایع، معادن و کشاورزی یزد — آموزش، مشاوره، رویدادهای فناورانه و اتصال شرکت‌های دانش‌بنیان به صنایع.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}

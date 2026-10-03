import Link from 'next/link';
import { AdminHeading, Badge, Table, Td } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/format';
import { listServiceTiles } from '@/modules/services/service';

export const metadata = { title: 'خدمات مرکز' };

export default async function ServicesPage() {
  const tiles = await listServiceTiles();
  return (
    <>
      <AdminHeading title="خدمات مرکز" />
      <p className="mb-4 text-sm leading-7 text-ink-2">
        هفت کاشی بخش «خدمات مرکز» در صفحهٔ اصلی. برای ویرایش عنوان، توضیح، متن صفحه یا راه‌اندازی
        خدمت‌های «به‌زودی»، روی هر کدام بزنید.
      </p>
      <Table head={['خدمت', 'وضعیت', 'نشانی در سایت', 'آخرین ویرایش']}>
        {tiles.map((tile) => (
          <tr key={tile.slug}>
            <Td>
              <Link href={`/admin/services/${tile.slug}`} className="text-primary hover:underline">
                {tile.title}
              </Link>
            </Td>
            <Td>
              {tile.isPlaceholder ? (
                <Badge tone="DRAFT">به‌زودی</Badge>
              ) : (
                <Badge tone="PUBLISHED">فعال</Badge>
              )}
            </Td>
            <Td>
              <Link href={tile.href} target="_blank" dir="ltr" className="text-xs text-ink-2">
                {tile.href}
              </Link>
            </Td>
            <Td>{tile.updatedAt ? formatDateTime(tile.updatedAt) : '—'}</Td>
          </tr>
        ))}
      </Table>
    </>
  );
}

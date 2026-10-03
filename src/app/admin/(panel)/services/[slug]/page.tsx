import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { decodeParam } from '@/lib/params';
import { editorHtml } from '@/lib/rich-html';
import { getServiceTile } from '@/modules/services/service';
import { ServiceForm } from '../service-form';

export const metadata = { title: 'ویرایش خدمت' };

export default async function ServiceEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const tile = await getServiceTile(decodeParam((await params).slug));
  if (!tile) notFound();
  return (
    <>
      <AdminHeading title={`ویرایش «${tile.title}»`}>
        <Link href={tile.href} target="_blank" className={secondaryButtonClass}>
          مشاهده در سایت
        </Link>
      </AdminHeading>
      <ServiceForm
        key={tile.slug}
        slug={tile.slug}
        fixed={tile.fixed}
        initial={{
          title: tile.title,
          summary: tile.summary ?? '',
          isPlaceholder: tile.isPlaceholder ? 'on' : '',
          body: editorHtml(tile.bodyHtml, null),
        }}
      />
    </>
  );
}

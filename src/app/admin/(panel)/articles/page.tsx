import Link from 'next/link';
import {
  AdminHeading,
  Badge,
  ButtonLink,
  EmptyState,
  Pager,
  Table,
  Td,
} from '@/components/admin/ui';
import { articleKindLabel, contentStatusLabel } from '@/content/admin';
import { formatDate } from '@/lib/format';
import { pageParam } from '@/lib/params';
import { listArticlesForAdmin } from '@/modules/content/service';
import { requireAdmin } from '@/modules/auth/service';

export const metadata = { title: 'اخبار و رویدادها' };

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = pageParam((await searchParams).page);
  const { items, pageCount } = await listArticlesForAdmin(page);

  return (
    <>
      <AdminHeading title="اخبار و رویدادها">
        <ButtonLink href="/admin/articles/new">مطلب جدید</ButtonLink>
      </AdminHeading>
      {items.length === 0 ? (
        <EmptyState>هنوز مطلبی ثبت نشده است.</EmptyState>
      ) : (
        <Table head={['عنوان', 'نوع', 'وضعیت', 'تاریخ انتشار', 'آخرین ویرایش']}>
          {items.map((article) => (
            <tr key={article.id}>
              <Td>
                <Link
                  href={`/admin/articles/${article.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {article.title}
                </Link>
              </Td>
              <Td>{articleKindLabel[article.kind]}</Td>
              <Td>
                <Badge tone={article.status}>{contentStatusLabel[article.status]}</Badge>
              </Td>
              <Td>{article.publishedAt ? formatDate(article.publishedAt) : '—'}</Td>
              <Td>{formatDate(article.updatedAt)}</Td>
            </tr>
          ))}
        </Table>
      )}
      <Pager page={page} pageCount={pageCount} basePath="/admin/articles" />
    </>
  );
}

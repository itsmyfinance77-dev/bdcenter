import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '@/components/admin/confirm-button';
import { AdminHeading, secondaryButtonClass } from '@/components/admin/ui';
import { articleBasePath } from '@/components/article-list';
import { formatJalaliInput } from '@/lib/jalali';
import { getArticleForAdmin } from '@/modules/content/service';
import { deleteArticleAction } from '../actions';
import { ArticleForm } from '../article-form';

export const metadata = { title: 'ویرایش مطلب' };

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const article = await getArticleForAdmin(id);
  if (!article) notFound();

  const initial = {
    kind: article.kind,
    status: article.status,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? '',
    bodyMarkdown: article.bodyMarkdown,
    eventStartsAt: article.eventStartsAt ? formatJalaliInput(article.eventStartsAt) : '',
    eventEndsAt: article.eventEndsAt ? formatJalaliInput(article.eventEndsAt) : '',
    eventLocation: article.eventLocation ?? '',
  };

  return (
    <>
      <AdminHeading title="ویرایش مطلب">
        {article.status === 'PUBLISHED' ? (
          <Link
            href={`${articleBasePath[article.kind]}/${article.slug}`}
            target="_blank"
            className={secondaryButtonClass}
          >
            مشاهده در سایت
          </Link>
        ) : null}
        <ConfirmButton
          action={deleteArticleAction.bind(null, article.id)}
          message={`«${article.title}» برای همیشه حذف شود؟`}
        >
          حذف
        </ConfirmButton>
      </AdminHeading>
      {saved ? (
        <p
          role="status"
          className="mb-4 rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          ذخیره شد.
        </p>
      ) : null}
      {/* key: remount with fresh defaults after each save */}
      <ArticleForm key={article.updatedAt.toISOString()} id={article.id} initial={initial} />
    </>
  );
}

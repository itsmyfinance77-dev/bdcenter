import type { Metadata } from 'next';
import { InstitutionalPage, systemPageMetadata } from '@/components/institutional-page';
import { siteInfo } from '@/content/site';
import { getSystemPageContent } from '@/modules/pages/service';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata('about');
}

export default async function AboutPage() {
  const page = await getSystemPageContent('about');
  return (
    <InstitutionalPage title="درباره مرکز" lead={siteInfo.parentOrg} page={page} aboutLayout />
  );
}

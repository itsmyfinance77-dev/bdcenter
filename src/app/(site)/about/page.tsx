import type { Metadata } from 'next';
import { InstitutionalPage, systemPageMetadata } from '@/components/institutional-page';
import { siteInfo } from '@/content/site';
import { getSystemPageContent } from '@/modules/pages/service';
import { getContactInfo } from '@/modules/settings/service';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata('about');
}

export default async function AboutPage() {
  const [page, contact] = await Promise.all([getSystemPageContent('about'), getContactInfo()]);
  return (
    <InstitutionalPage
      title="درباره مرکز"
      lead={siteInfo.parentOrg}
      page={page}
      aboutLayout
      address={contact.address}
    />
  );
}

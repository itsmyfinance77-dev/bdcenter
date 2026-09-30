import type { Metadata } from 'next';
import { InstitutionalPage, systemPageMetadata } from '@/components/institutional-page';
import { getSystemPageContent, systemPage } from '@/modules/pages/service';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata('privacy');
}

export default async function PrivacyPage() {
  const page = await getSystemPageContent('privacy');
  return <InstitutionalPage title={systemPage('privacy')!.title} page={page} />;
}

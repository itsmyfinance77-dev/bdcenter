import type { Metadata } from 'next';
import { InstitutionalPage, systemPageMetadata } from '@/components/institutional-page';
import { getSystemPageContent, systemPage } from '@/modules/pages/service';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return systemPageMetadata('terms');
}

export default async function TermsPage() {
  const page = await getSystemPageContent('terms');
  return <InstitutionalPage title={systemPage('terms')!.title} page={page} />;
}

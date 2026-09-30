import { NotFoundMessage } from '@/components/not-found-message';
import SiteLayout from './(site)/layout';

/** Unmatched URLs land here, outside the (site) group, so wrap them in the site chrome. */
export default function NotFound() {
  return (
    <SiteLayout>
      <NotFoundMessage />
    </SiteLayout>
  );
}

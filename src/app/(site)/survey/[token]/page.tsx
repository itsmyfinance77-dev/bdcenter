import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { FormCard, PageBody } from '@/components/site/page-body';
import { surveyCopy } from '@/content/surveys';
import { decodeParam } from '@/lib/params';
import { getSurvey } from '@/modules/surveys/service';
import { SurveyForm } from './survey-form';

export const dynamic = 'force-dynamic';

// A personal link: never in search engines, never sent onwards as a referrer.
export const metadata: Metadata = {
  title: surveyCopy.pageTitle,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const token = decodeParam((await params).token).slice(0, 64);
  const survey = await getSurvey(token);
  const closed = {
    answered: surveyCopy.answered,
    expired: surveyCopy.expired,
    'not-found': surveyCopy.notFound,
  } as const;

  return (
    <>
      <PageHeader title={surveyCopy.pageTitle} crumbs={[{ title: surveyCopy.pageTitle }]} />
      <PageBody narrow>
        {survey.status === 'open' ? (
          <FormCard
            id="survey-question"
            title={surveyCopy.question}
            requiredNote={false}
            note={<p className="leading-8 text-ink-2">{surveyCopy.lead(survey.subject)}</p>}
          >
            <SurveyForm token={token} />
          </FormCard>
        ) : (
          <p
            role="status"
            className="rounded-panel border border-line bg-white p-6 text-center text-ink"
          >
            {closed[survey.status]}
          </p>
        )}
      </PageBody>
    </>
  );
}

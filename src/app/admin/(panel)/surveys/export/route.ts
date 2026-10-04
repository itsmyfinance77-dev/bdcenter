import { attachmentDisposition } from '@/lib/csv';
import { getCurrentAdmin } from '@/modules/auth/service';
import { exportSurveyAnswersCsv, surveyFilterSchema } from '@/modules/surveys/service';

/** Survey answers (optionally `?kind=` and `?group=`) as a CSV file for Excel. */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response('Unauthorized', { status: 401 });
  const params = new URL(request.url).searchParams;
  const filter = surveyFilterSchema.parse({
    kind: params.get('kind') ?? undefined,
    groupId: params.get('group') ?? undefined,
  });
  return new Response(await exportSurveyAnswersCsv(filter, admin.id), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': attachmentDisposition('survey-answers.csv'),
      'Cache-Control': 'no-store',
    },
  });
}

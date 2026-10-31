import { z } from 'zod';
import { markOpened, saveProgress } from '@/db/services/survey-responses';
import { verifySurveyToken } from '@/lib/surveys/tokens';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';
import { readJsonBody, respondentJson, respondentNotFound } from '@/lib/surveys/respondent-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z
  .object({
    /** `opened`: the respondent viewed the intro. Without `answers` it only marks the invitation. */
    event: z.literal('opened').optional(),
    /** Draft answers keyed by question id; shape-validated again by the service. */
    answers: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine((value) => value.event !== undefined || value.answers !== undefined, {
    message: 'event or answers is required',
  });

/**
 * POST /api/surveys/[token]/progress
 * Draft autosave (marks the invitation started) or the `opened` marker.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitationId = verifySurveyToken(token);
    if (!invitationId) return respondentNotFound();

    const read = await readJsonBody(request);
    if (!read.ok) return read.response;
    const parsed = bodySchema.safeParse(read.body);
    if (!parsed.success) return respondentJson({ error: 'invalid_body' }, 400);

    const { event, answers } = parsed.data;
    if (answers === undefined && event === 'opened') {
      const written = await markOpened(invitationId);
      return written ? respondentJson({ ok: true }) : respondentJson({ error: 'closed' }, 409);
    }

    const result = await saveProgress(invitationId, answers);
    if (result.ok) return respondentJson({ ok: true });
    switch (result.reason) {
      case 'invalid':
        return respondentNotFound();
      case 'invalid_answers':
        return respondentJson({ error: 'invalid_answers' }, 400);
      case 'submitted':
        return respondentJson({ error: 'submitted' }, 409);
      default:
        return respondentJson({ error: 'closed' }, 409);
    }
  } catch (error) {
    surveyRespondentLogger.error('survey_progress_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respondentJson({ error: 'server_error' }, 500);
  }
}

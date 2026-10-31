import { resolveInvitation } from '@/db/services/survey-responses';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';
import { respondentJson, respondentNotFound } from '@/lib/surveys/respondent-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/surveys/[token]
 * Respondent-safe invitation state. The definition is returned in full (all locales); the client
 * localizes it. Invalid tokens always answer the same 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const state = await resolveInvitation(token);
    if (state.state === 'invalid') return respondentNotFound();
    return respondentJson({ ...state });
  } catch (error) {
    surveyRespondentLogger.error('survey_state_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respondentJson({ error: 'server_error' }, 500);
  }
}

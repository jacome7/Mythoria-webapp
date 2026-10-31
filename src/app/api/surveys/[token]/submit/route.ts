import { z } from 'zod';
import { submitResponse, MAX_SUBMISSION_KEY_LENGTH } from '@/db/services/survey-responses';
import { verifySurveyToken } from '@/lib/surveys/tokens';
import { surveyRespondentLogger } from '@/lib/surveys/respondent-logger';
import { readJsonBody, respondentJson, respondentNotFound } from '@/lib/surveys/respondent-api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({ answers: z.record(z.string(), z.unknown()) }).strict();

/**
 * POST /api/surveys/[token]/submit  (header `Idempotency-Key`, required, max 128 chars)
 * Re-validates the answers server-side, stores them and (when eligible) creates the reward
 * entitlement. Retrying with the same key (or after success) returns the stored result.
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const invitationId = verifySurveyToken(token);
    if (!invitationId) return respondentNotFound();

    const key = request.headers.get('idempotency-key')?.trim();
    if (!key || key.length > MAX_SUBMISSION_KEY_LENGTH) {
      return respondentJson({ error: 'idempotency_key_required' }, 400);
    }

    const read = await readJsonBody(request);
    if (!read.ok) return read.response;
    const parsed = bodySchema.safeParse(read.body);
    if (!parsed.success) return respondentJson({ error: 'invalid_body' }, 400);

    const result = await submitResponse(token, parsed.data.answers, key);
    if (result.ok) {
      surveyRespondentLogger.info('survey_submitted', {
        invitationId,
        alreadySubmitted: result.alreadySubmitted,
        rewardStatus: result.rewardStatus ?? null,
      });
      return respondentJson({
        ok: true,
        alreadySubmitted: result.alreadySubmitted,
        entitlementId: result.entitlementId ?? null,
        rewardStatus: result.rewardStatus ?? null,
      });
    }
    switch (result.reason) {
      case 'invalid':
        return respondentNotFound();
      case 'validation':
        return respondentJson({ ok: false, error: 'validation', errors: result.errors }, 422);
      case 'key_conflict':
        return respondentJson({ error: 'idempotency_key_conflict' }, 409);
      default:
        return respondentJson({ error: 'closed' }, 409);
    }
  } catch (error) {
    surveyRespondentLogger.error('survey_submit_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return respondentJson({ error: 'server_error' }, 500);
  }
}

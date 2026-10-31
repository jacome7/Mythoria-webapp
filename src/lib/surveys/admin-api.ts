import { OAuth2Client } from 'google-auth-library';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createStudy,
  getStudy,
  linkCampaigns,
  listStudies,
  listSurveys,
  previewAudience,
  setStudyStatus,
  snapshotAudience,
  updateStudy,
} from '@/db/services/survey-studies';
import { SURVEY_COHORT_KEYS } from '@/lib/surveys/cohorts';
import { SurveyAdminError } from '@/lib/surveys/errors';
import { surveyLogger } from '@/lib/surveys/logger';

const oidc = new OAuth2Client();

/**
 * Verifies the Google OIDC ID token of a service-to-service call.
 * - 401: missing/invalid token, or the service is not configured (fail closed).
 * - 403: valid Google token issued to a different service account.
 * Same pattern as `verifyReferralServiceIdentity`, with the SURVEY_* configuration.
 */
export async function verifySurveyServiceIdentity(
  request: Request,
  kind: 'admin' | 'scheduler' = 'admin',
): Promise<string> {
  const account =
    process.env[
      kind === 'admin' ? 'SURVEY_ADMIN_SERVICE_ACCOUNT' : 'SURVEY_SCHEDULER_SERVICE_ACCOUNT'
    ];
  const audience = process.env.SURVEY_INTERNAL_AUDIENCE;
  const bearer = request.headers.get('authorization');
  if (!account || !audience || !bearer?.startsWith('Bearer ')) {
    throw new SurveyAdminError('unauthorized', 'Missing or invalid credentials', 401);
  }
  let email: string | undefined;
  try {
    const ticket = await oidc.verifyIdToken({ idToken: bearer.slice(7), audience });
    const payload = ticket.getPayload();
    if (!payload?.email_verified) throw new Error('email not verified');
    email = payload.email;
  } catch {
    throw new SurveyAdminError('unauthorized', 'Missing or invalid credentials', 401);
  }
  if (email !== account) {
    throw new SurveyAdminError('forbidden', 'Caller is not allowed to use this API', 403);
  }
  return email;
}

// ---------------------------------------------------------------------------------------------
// Command contract (docs/SURVEYS.md "WebApp internal command API")
// ---------------------------------------------------------------------------------------------

const isoDate = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const studyId = z.uuid();
const cohortKey = z.enum(SURVEY_COHORT_KEYS);
const preferences = z.array(z.enum(['essential', 'inspiration', 'news'])).max(3);

const rewardPolicySchema = z
  .object({
    // Drafts may be saved incomplete (admin sends `null` for an empty deadline); activating a
    // reward-eligible study is rejected by `setStudyStatus` until both are present.
    rewardTypes: z.array(z.enum(['pdf', 'audiobook'])),
    redemptionDeadline: z.iso.datetime({ offset: true }).nullish(),
    allowExistingAudiobook: z.boolean().default(false),
  })
  .strict();

const cohortInput = z.object({
  cohortKey,
  surveyId: z.string().trim().min(1).max(64),
  version: z.number().int().positive(),
});

const studyFields = {
  title: z.string().trim().min(1).max(255),
  opensAt: isoDate.nullable(),
  closesAt: isoDate.nullable(),
  holdoutPercent: z.number().int().min(0).max(50),
  rewardPolicy: rewardPolicySchema.nullable(),
  cohorts: z.array(cohortInput).min(1).max(SURVEY_COHORT_KEYS.length),
};

const actorSchema = z.object({ email: z.email().max(255) });

function command<Op extends string, Shape extends z.ZodType>(operation: Op, input: Shape) {
  return z.object({ operation: z.literal(operation), input, actor: actorSchema });
}

export const surveyCommandSchema = z.discriminatedUnion('operation', [
  command('listSurveys', z.object({}).default({})),
  command('listStudies', z.object({}).default({})),
  command('getStudy', z.object({ studyId })),
  command(
    'createStudy',
    z.object({
      studyKey: z
        .string()
        .trim()
        .regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
      ...studyFields,
      opensAt: studyFields.opensAt.optional(),
      closesAt: studyFields.closesAt.optional(),
      rewardPolicy: studyFields.rewardPolicy.optional(),
    }),
  ),
  command(
    'updateStudy',
    z
      .object({
        studyId,
        title: studyFields.title.optional(),
        opensAt: studyFields.opensAt.optional(),
        closesAt: studyFields.closesAt.optional(),
        holdoutPercent: studyFields.holdoutPercent.optional(),
        rewardPolicy: studyFields.rewardPolicy.optional(),
        cohorts: studyFields.cohorts.optional(),
      })
      .strict(),
  ),
  command(
    'setStudyStatus',
    z.object({ studyId, status: z.enum(['draft', 'active', 'closed', 'archived']) }),
  ),
  command(
    'previewAudience',
    z.object({ studyId, notificationPreferences: preferences.optional() }),
  ),
  command(
    'snapshotAudience',
    z.object({
      studyId,
      cohortKeys: z.array(cohortKey).min(1).max(SURVEY_COHORT_KEYS.length),
      notificationPreferences: preferences.optional(),
      dryRun: z.boolean().default(false),
    }),
  ),
  command(
    'linkCampaigns',
    z.object({
      studyId,
      cohortKey,
      inviteCampaignId: z.string().trim().min(1).max(64).nullable().optional(),
      reminderCampaignId: z.string().trim().min(1).max(64).nullable().optional(),
    }),
  ),
]);

export type SurveyCommand = z.infer<typeof surveyCommandSchema>;
export type SurveyOperation = SurveyCommand['operation'];

export async function executeSurveyCommand(cmd: SurveyCommand): Promise<unknown> {
  switch (cmd.operation) {
    case 'listSurveys':
      return { surveys: await listSurveys() };
    case 'listStudies':
      return { studies: await listStudies() };
    case 'getStudy':
      return getStudy(cmd.input.studyId);
    case 'createStudy': {
      const { studyKey, title, opensAt, closesAt, holdoutPercent, rewardPolicy, cohorts } =
        cmd.input;
      return createStudy(
        { studyKey, title, opensAt, closesAt, holdoutPercent, rewardPolicy, cohorts },
        cmd.actor.email,
      );
    }
    case 'updateStudy': {
      const { studyId: id, ...patch } = cmd.input;
      return updateStudy(id, patch);
    }
    case 'setStudyStatus':
      return setStudyStatus(cmd.input.studyId, cmd.input.status);
    case 'previewAudience':
      return previewAudience(cmd.input.studyId, cmd.input.notificationPreferences);
    case 'snapshotAudience':
      return snapshotAudience(
        cmd.input.studyId,
        cmd.input.cohortKeys,
        cmd.input.notificationPreferences,
        cmd.input.dryRun,
      );
    case 'linkCampaigns':
      return linkCampaigns(cmd.input);
  }
}

export function surveyJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export function surveyHttpError(error: unknown) {
  if (error instanceof SurveyAdminError) {
    return surveyJson({ error: { code: error.code, message: error.message } }, error.status);
  }
  if (error instanceof z.ZodError) {
    const message = error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    return surveyJson({ error: { code: 'invalid_input', message } }, 400);
  }
  surveyLogger.error('survey_command_failed', {
    errorMessage: error instanceof Error ? error.message : String(error),
  });
  return surveyJson({ error: { code: 'internal_error', message: 'Internal error' } }, 500);
}

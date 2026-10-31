import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import {
  getEntitlementForAuthor,
  selectReward,
  SurveyRewardError,
  type SurveyRewardErrorCode,
} from '@/db/services/survey-rewards';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import {
  startProductGeneration,
  SurveyRewardFundingError,
  type SurveyRewardFundingErrorCode,
} from '@/lib/product-generation';
import { launchAudiobookWorkflow, launchSelfPrintWorkflow } from '@/lib/product-launch';
import { getRecommendedVoice, getTTSProvider } from '@/lib/voice-options';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REWARD_ERROR_STATUS: Record<SurveyRewardErrorCode, number> = {
  not_found: 404,
  story_not_found: 404,
  expired: 410,
  pending_story: 409,
  not_selectable: 409,
  already_redeemed: 409,
  reward_type_not_allowed: 400,
  audiobook_exists: 409,
};

const FUNDING_ERROR_STATUS: Record<SurveyRewardFundingErrorCode, number> = {
  entitlement_not_found: 404,
  entitlement_forbidden: 404,
  entitlement_status: 409,
  entitlement_expired: 410,
  entitlement_mismatch: 409,
  product_in_progress: 409,
};

function failure(code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ success: false, code, error: code, ...extra }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entitlementId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return failure('unauthorized', 401);

    const { entitlementId } = await params;
    if (!UUID.test(entitlementId)) return failure('not_found', 404);

    let body: { rewardType?: unknown; storyId?: unknown; analyticsContext?: unknown };
    try {
      body = await request.json();
    } catch {
      return failure('invalid_request', 400);
    }
    const rewardType = body.rewardType;
    const storyId = body.storyId;
    if (
      (rewardType !== 'pdf' && rewardType !== 'audiobook') ||
      typeof storyId !== 'string' ||
      !UUID.test(storyId)
    ) {
      return failure('invalid_request', 400);
    }

    // Only the author the invitation was issued to can see or claim the gift.
    const view = await getEntitlementForAuthor(entitlementId, author.authorId);
    if (!view) return failure('not_found', 404);

    const story = await storyService.getStoryById(storyId);
    if (!story || story.authorId !== author.authorId) return failure('story_not_found', 404);
    if (story.status !== 'published') return failure('story_not_published', 409);

    // Fail before any state change: a PDF gift is e-mailed to the author.
    if (rewardType === 'pdf' && !author.email) return failure('author_email_missing', 409);

    await selectReward(entitlementId, author.authorId, rewardType, storyId);

    const analytics = await resolveServerAnalyticsContext({
      browserContext: body.analyticsContext,
      attributionId: request.cookies.get('mythoria_attribution')?.value,
      authorId: author.authorId,
      storedConsentValue: request.cookies.get('mythoria_consent')?.value,
    });
    const actionType = rewardType === 'pdf' ? 'self_print' : 'audiobook_generation';
    const started = await startProductGeneration({
      actionType,
      authorId: author.authorId,
      userId: author.clerkUserId,
      storyId,
      // Replaced by `survey_reward:{entitlementId}:{attempt}` inside the funded start.
      idempotencyKey: `survey_reward:${entitlementId}`,
      creditsSpent: 0,
      creditEventType: rewardType === 'pdf' ? 'selfPrinting' : 'audioBookGeneration',
      funding: { type: 'survey_reward', entitlementId },
      attributionId: analytics.attributionId,
      analyticsContext: analytics.context,
      analyticsConsent: analytics.consent,
      primaryIntent: analytics.primaryIntent,
      landingSlug: analytics.landingSlug,
    });

    if (started.request.status === 'failed') {
      return failure('previous_attempt_failed', 409);
    }
    if (started.duplicate || started.request.status !== 'pending') {
      // A retried or concurrent request: the gift is already being produced (or about to be, by
      // the call that created it). Never launch the workflow a second time.
      return NextResponse.json(
        {
          success: true,
          rewardType,
          status: started.request.status,
          alreadyStarted: true,
          runId: started.request.runId,
        },
        { status: 202 },
      );
    }

    const runId = started.request.runId;
    if (rewardType === 'audiobook') {
      const launched = await launchAudiobookWorkflow({
        storyId,
        runId,
        voice: getRecommendedVoice(getTTSProvider(), story.targetAudience),
        includeBackgroundMusic: true,
      });
      if (!launched.ok) return failure('launch_failed', 502, { retryable: true });
    } else {
      const launched = await launchSelfPrintWorkflow({
        storyId,
        workflowId: runId,
        locale: story.storyLanguage || 'en-US',
        recipients: [],
        generateCMYK: true,
        requestedByAuthorId: author.authorId,
        requestedByEmail: author.email as string,
      });
      if (!launched.ok) return failure('launch_failed', 502, { retryable: true });
    }

    return NextResponse.json({ success: true, rewardType, status: 'queued' }, { status: 202 });
  } catch (error) {
    if (error instanceof SurveyRewardError) {
      return failure(error.code, REWARD_ERROR_STATUS[error.code]);
    }
    if (error instanceof SurveyRewardFundingError) {
      return failure(error.code, FUNDING_ERROR_STATUS[error.code]);
    }
    console.error('Error redeeming survey reward:', error);
    return failure('internal_error', 500);
  }
}

import { storyService } from '@/db/services';
import { publishAudiobookRequest } from '@/lib/pubsub';
import { sgwFetch } from '@/lib/sgw-client';
import { analyticsReference } from '@/lib/analytics/reference';
import { compensateProductGeneration, markProductGenerationQueued } from '@/lib/product-generation';

/**
 * Shared "hand the pending request to the workflow" helpers. Both the credit-funded story routes
 * and the survey-reward redeem route call these, so the Pub/Sub / SGW contract lives in one place.
 * Callers create the durable request first (`startProductGeneration`); these helpers enqueue it,
 * compensate the request when enqueueing fails and mark it queued when it succeeds.
 */

export type LaunchAudiobookResult = { ok: true; messageId: string } | { ok: false };

export async function launchAudiobookWorkflow(params: {
  storyId: string;
  runId: string;
  voice: string;
  includeBackgroundMusic: boolean;
}): Promise<LaunchAudiobookResult> {
  const { storyId, runId, voice, includeBackgroundMusic } = params;

  // Update story status to indicate audiobook generation is in progress
  await storyService.updateStory(storyId, {
    audiobookStatus: 'generating' as const,
  });

  // Publish the Pub/Sub message to trigger the audiobook generation workflow
  let messageId: string;
  try {
    messageId = String(
      await publishAudiobookRequest({
        storyId,
        runId,
        voice,
        includeBackgroundMusic,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (pubsubError) {
    console.error('Failed to publish audiobook request:', pubsubError);

    // Compensate first: it re-checks, under a row lock, that the request is still `pending`. If a
    // concurrent launcher already queued it, nothing is compensated and the story status that the
    // live run depends on must not be reverted either.
    const compensated = await compensateProductGeneration(runId, 'queue', 'pubsub_publish_failed');
    if (compensated !== false) {
      // We could not trigger the workflow: revert the story status.
      await storyService.updateStory(storyId, {
        audiobookStatus: null,
      });
    }
    return { ok: false };
  }

  await markProductGenerationQueued(runId, messageId);
  console.info('[Audiobook] Generation request queued', {
    runRef: analyticsReference(runId),
  });
  return { ok: true, messageId };
}

export interface SelfPrintWorkflowSuccessResponse {
  success: true;
  storyId: string;
  workflowId: string;
  executionId: string;
  recipients: string[];
  message?: string;
}

interface SelfPrintWorkflowErrorResponse {
  success: false;
  error?: string;
  message?: string;
}

type SelfPrintWorkflowResponse = SelfPrintWorkflowSuccessResponse | SelfPrintWorkflowErrorResponse;

export type LaunchSelfPrintResult =
  { ok: true; result: SelfPrintWorkflowSuccessResponse } | { ok: false };

export async function launchSelfPrintWorkflow(params: {
  storyId: string;
  workflowId: string;
  locale: string;
  /** Extra recipients beyond the author; empty means "author only". */
  recipients: { email: string }[];
  generateCMYK: boolean;
  requestedByAuthorId: string;
  requestedByEmail: string;
}): Promise<LaunchSelfPrintResult> {
  const { storyId, workflowId } = params;

  let workflowResult: SelfPrintWorkflowSuccessResponse;
  try {
    const workflowResponse = await sgwFetch('/print/self-service', {
      method: 'POST',
      body: JSON.stringify({
        storyId,
        workflowId,
        recipients: params.recipients.length ? params.recipients : undefined,
        includeAuthorEmail: true,
        locale: params.locale,
        generateCMYK: params.generateCMYK,
        metadata: {
          requestSource: 'webapp',
          requestedByAuthorId: params.requestedByAuthorId,
          requestedByEmail: params.requestedByEmail,
        },
      }),
    });

    const parsed = (await workflowResponse.json()) as SelfPrintWorkflowResponse;

    if (!workflowResponse.ok || !parsed.success) {
      console.error('Self-print workflow enqueue failed', {
        storyId,
        status: workflowResponse.status,
        response: parsed,
      });

      await compensateProductGeneration(workflowId, 'queue', 'workflow_enqueue_failed');
      return { ok: false };
    }

    workflowResult = parsed;
  } catch (error) {
    console.error('Self-print workflow threw', { storyId, error });

    await compensateProductGeneration(workflowId, 'queue', 'workflow_enqueue_failed');
    return { ok: false };
  }

  await markProductGenerationQueued(workflowId, workflowResult.executionId);

  console.info('[SelfPrint] Workflow queued', {
    workflowRef: analyticsReference(workflowId),
    recipientCount: workflowResult.recipients.length,
  });
  return { ok: true, result: workflowResult };
}

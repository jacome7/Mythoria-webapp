jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const getCurrentAuthorMock = jest.fn();
const getStoryByIdMock = jest.fn();
const getEntitlementForAuthorMock = jest.fn();
const selectRewardMock = jest.fn();
const startProductGenerationMock = jest.fn();
const launchAudiobookWorkflowMock = jest.fn();
const launchSelfPrintWorkflowMock = jest.fn();
const resolveServerAnalyticsContextMock = jest.fn();

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getCurrentAuthorMock() }));
jest.mock('@/db/services', () => ({
  storyService: { getStoryById: (...args: unknown[]) => getStoryByIdMock(...args) },
}));
jest.mock('@/db/services/survey-rewards', () => {
  class SurveyRewardError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    SurveyRewardError,
    getEntitlementForAuthor: (...args: unknown[]) => getEntitlementForAuthorMock(...args),
    selectReward: (...args: unknown[]) => selectRewardMock(...args),
  };
});
jest.mock('@/lib/analytics/server-context', () => ({
  resolveServerAnalyticsContext: (...args: unknown[]) => resolveServerAnalyticsContextMock(...args),
}));
jest.mock('@/lib/product-generation', () => {
  class SurveyRewardFundingError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  }
  return {
    SurveyRewardFundingError,
    startProductGeneration: (...args: unknown[]) => startProductGenerationMock(...args),
  };
});
jest.mock('@/lib/product-launch', () => ({
  launchAudiobookWorkflow: (...args: unknown[]) => launchAudiobookWorkflowMock(...args),
  launchSelfPrintWorkflow: (...args: unknown[]) => launchSelfPrintWorkflowMock(...args),
}));
jest.mock('@/lib/voice-options', () => ({
  getTTSProvider: () => 'openai',
  getRecommendedVoice: () => 'nova',
}));

import type { NextRequest } from 'next/server';
import { SurveyRewardError, type SurveyRewardErrorCode } from '@/db/services/survey-rewards';
import { SurveyRewardFundingError } from '@/lib/product-generation';
import { POST } from './route';

const ENT = '11111111-1111-4111-8111-111111111111';
const STORY = '22222222-2222-4222-8222-222222222222';

const call = (body: unknown, entitlementId = ENT) =>
  POST(
    {
      json: async () => body,
      cookies: { get: () => undefined },
    } as unknown as NextRequest,
    { params: Promise.resolve({ entitlementId }) },
  );

describe('POST /api/surveys/rewards/[entitlementId]/redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
      email: 'a@example.com',
    });
    getEntitlementForAuthorMock.mockResolvedValue({ entitlement: { entitlementId: ENT } });
    getStoryByIdMock.mockResolvedValue({
      storyId: STORY,
      authorId: 'author-1',
      status: 'published',
      storyLanguage: 'pt-PT',
      targetAudience: 'children_7-10',
    });
    selectRewardMock.mockResolvedValue({});
    resolveServerAnalyticsContextMock.mockResolvedValue({});
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-1', status: 'pending' },
      remainingCredits: 0,
      duplicate: false,
    });
    launchAudiobookWorkflowMock.mockResolvedValue({ ok: true, messageId: 'm1' });
    launchSelfPrintWorkflowMock.mockResolvedValue({ ok: true, result: {} });
  });

  it('requires a signed-in author', async () => {
    getCurrentAuthorMock.mockResolvedValue(null);
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(401);
  });

  it('answers 404 when the gift belongs to someone else', async () => {
    getEntitlementForAuthorMock.mockResolvedValue(null);
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(404);
    expect(selectRewardMock).not.toHaveBeenCalled();
    expect(startProductGenerationMock).not.toHaveBeenCalled();
  });

  it('validates the body and ids', async () => {
    expect((await call({ rewardType: 'coupon', storyId: STORY })).status).toBe(400);
    expect((await call({ rewardType: 'pdf', storyId: 'nope' })).status).toBe(400);
    expect((await call({ rewardType: 'pdf', storyId: STORY }, 'not-a-uuid')).status).toBe(404);
  });

  it('rejects stories that are not owned or not published', async () => {
    getStoryByIdMock.mockResolvedValue({ storyId: STORY, authorId: 'other', status: 'published' });
    expect((await call({ rewardType: 'pdf', storyId: STORY })).status).toBe(404);

    getStoryByIdMock.mockResolvedValue({ storyId: STORY, authorId: 'author-1', status: 'draft' });
    expect((await call({ rewardType: 'pdf', storyId: STORY })).status).toBe(409);
    expect(startProductGenerationMock).not.toHaveBeenCalled();
  });

  it('starts an audiobook gift funded by the entitlement', async () => {
    const response = await call({ rewardType: 'audiobook', storyId: STORY });

    expect(response.status).toBe(202);
    expect(selectRewardMock).toHaveBeenCalledWith(ENT, 'author-1', 'audiobook', STORY);
    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'audiobook_generation',
        creditsSpent: 0,
        funding: { type: 'survey_reward', entitlementId: ENT },
      }),
    );
    expect(launchAudiobookWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: STORY, runId: 'run-1', voice: 'nova' }),
    );
    expect(launchSelfPrintWorkflowMock).not.toHaveBeenCalled();
  });

  it('starts a PDF gift for the author email only', async () => {
    const response = await call({ rewardType: 'pdf', storyId: STORY });

    expect(response.status).toBe(202);
    expect(startProductGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'self_print', creditEventType: 'selfPrinting' }),
    );
    expect(launchSelfPrintWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'run-1',
        recipients: [],
        locale: 'pt-PT',
        requestedByEmail: 'a@example.com',
      }),
    );
  });

  it('returns the live run for a retried request without launching again', async () => {
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-1', status: 'queued' },
      remainingCredits: 0,
      duplicate: true,
    });
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ alreadyStarted: true, runId: 'run-1' });
    expect(launchSelfPrintWorkflowMock).not.toHaveBeenCalled();
  });

  it('does not launch again when a concurrent redeem returns a still-pending duplicate', async () => {
    startProductGenerationMock.mockResolvedValue({
      request: { runId: 'run-1', status: 'pending' },
      remainingCredits: 0,
      duplicate: true,
    });
    for (const rewardType of ['audiobook', 'pdf']) {
      const response = await call({ rewardType, storyId: STORY });
      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toMatchObject({
        alreadyStarted: true,
        runId: 'run-1',
      });
    }
    expect(launchAudiobookWorkflowMock).not.toHaveBeenCalled();
    expect(launchSelfPrintWorkflowMock).not.toHaveBeenCalled();
  });

  it('rejects a PDF gift without an author email before touching any state', async () => {
    getCurrentAuthorMock.mockResolvedValue({ authorId: 'author-1', clerkUserId: 'clerk-1' });
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'author_email_missing' });
    expect(selectRewardMock).not.toHaveBeenCalled();
    expect(startProductGenerationMock).not.toHaveBeenCalled();
  });

  it('reports a retryable 502 when the workflow could not be queued', async () => {
    launchAudiobookWorkflowMock.mockResolvedValue({ ok: false });
    const response = await call({ rewardType: 'audiobook', storyId: STORY });
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      code: 'launch_failed',
      retryable: true,
    });
  });

  it.each([
    ['expired', 410],
    ['audiobook_exists', 409],
    ['reward_type_not_allowed', 400],
    ['pending_story', 409],
    ['already_redeemed', 409],
  ])('maps reward error %s to %i', async (code, status) => {
    selectRewardMock.mockRejectedValue(new SurveyRewardError(code as SurveyRewardErrorCode));
    const response = await call({ rewardType: 'audiobook', storyId: STORY });
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ code });
  });

  it('maps funding errors to clean 4xx codes', async () => {
    startProductGenerationMock.mockRejectedValue(
      new SurveyRewardFundingError('product_in_progress'),
    );
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(409);
  });

  it('hides unexpected failures behind a 500', async () => {
    startProductGenerationMock.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await call({ rewardType: 'pdf', storyId: STORY });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ code: 'internal_error' });
  });
});

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const verifySchedulerRequestMock = jest.fn();
const unlockPendingStoriesMock = jest.fn();
const reconcileRewardsMock = jest.fn();
const listEntitlementsForAvailableEmailMock = jest.fn();
const sendAvailableMock = jest.fn();
const sendUnlockedMock = jest.fn();
const sendAudiobookReadyMock = jest.fn();

jest.mock('@/lib/scheduler-auth', () => ({
  verifySchedulerRequest: (...args: unknown[]) => verifySchedulerRequestMock(...args),
}));
jest.mock('@/db/services/survey-rewards', () => ({
  unlockPendingStories: () => unlockPendingStoriesMock(),
  reconcileRewards: () => reconcileRewardsMock(),
  listEntitlementsForAvailableEmail: () => listEntitlementsForAvailableEmailMock(),
}));
jest.mock('@/lib/surveys/reward-emails', () => ({
  sendRewardAvailableEmails: (...args: unknown[]) => sendAvailableMock(...args),
  sendFirstStoryUnlockedEmails: (...args: unknown[]) => sendUnlockedMock(...args),
  sendAudiobookReadyEmails: (...args: unknown[]) => sendAudiobookReadyMock(...args),
}));

import { POST } from './route';

describe('POST /api/internal/surveys/jobs/reconcile-rewards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    verifySchedulerRequestMock.mockResolvedValue(true);
    unlockPendingStoriesMock.mockResolvedValue(['u1']);
    reconcileRewardsMock.mockResolvedValue({
      delivered: ['d1'],
      failed: [],
      expired: ['x1'],
      invitationsExpired: 2,
    });
    listEntitlementsForAvailableEmailMock.mockResolvedValue(['u1', 'a1']);
    sendAvailableMock.mockResolvedValue({ sent: 1, failed: 0 });
    sendUnlockedMock.mockResolvedValue({ sent: 1, failed: 0 });
    sendAudiobookReadyMock.mockResolvedValue({ sent: 1, failed: 0 });
  });

  it('rejects callers that are not the survey scheduler', async () => {
    verifySchedulerRequestMock.mockResolvedValue(false);
    const response = await POST(new Request('https://example.com'));
    expect(response.status).toBe(401);
    expect(verifySchedulerRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      'SURVEY_SCHEDULER_SERVICE_ACCOUNT',
    );
    expect(unlockPendingStoriesMock).not.toHaveBeenCalled();
  });

  it('unlocks, reconciles and sends each email kind once per entitlement', async () => {
    const response = await POST(new Request('https://example.com'));

    expect(response.status).toBe(200);
    expect(sendUnlockedMock).toHaveBeenCalledWith(['u1']);
    // Entitlements unlocked in this run get the "unlocked" email, not "available".
    expect(sendAvailableMock).toHaveBeenCalledWith(['a1']);
    expect(sendAudiobookReadyMock).toHaveBeenCalledWith(['d1']);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      unlocked: 1,
      delivered: 1,
      expired: 1,
      invitationsExpired: 2,
    });
  });
});

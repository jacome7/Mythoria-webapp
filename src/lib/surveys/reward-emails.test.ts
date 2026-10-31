/** @jest-environment node */

const getRewardEmailContextsMock = jest.fn();
const sendTemplatedEmailMock = jest.fn();

jest.mock('@/db/services/survey-rewards', () => ({
  getRewardEmailContexts: (...args: unknown[]) => getRewardEmailContextsMock(...args),
}));
jest.mock('@/lib/notifications/client', () => ({
  notificationClient: {
    sendTemplatedEmail: (...args: unknown[]) => sendTemplatedEmailMock(...args),
  },
}));

import {
  rewardLink,
  sendAudiobookReadyEmails,
  sendFirstStoryUnlockedEmails,
  sendRewardAvailableEmails,
  storyListenLink,
} from './reward-emails';

const context = (overrides: Record<string, unknown> = {}) => ({
  entitlementId: 'ent-1',
  authorId: 'author-1',
  email: 'reader@example.com',
  displayName: 'Ana',
  locale: 'pt',
  expiresAt: new Date('2027-01-31T23:59:59Z'),
  rewardType: 'audiobook',
  storyId: 'story-1',
  storyTitle: 'A Lua',
  ...overrides,
});

describe('survey reward emails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = 'https://mythoria.test/';
    getRewardEmailContextsMock.mockResolvedValue([context()]);
    sendTemplatedEmailMock.mockResolvedValue({ success: true });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('builds locale-scoped links', () => {
    expect(rewardLink('pt', 'ent-1')).toBe('https://mythoria.test/pt-PT/survey/reward/ent-1');
    expect(storyListenLink('de-DE', 'story-1')).toBe(
      'https://mythoria.test/de-DE/stories/listen/story-1',
    );
  });

  it('sends the available email once per entitlement id', async () => {
    await expect(sendRewardAvailableEmails(['ent-1'])).resolves.toEqual({ sent: 1, failed: 0 });
    expect(sendTemplatedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'survey-reward-available',
        entityId: 'survey-reward-available:ent-1',
        authorId: 'author-1',
        recipients: [{ email: 'reader@example.com', name: 'Ana', language: 'pt-PT' }],
        variables: expect.objectContaining({
          name: 'Ana',
          rewardLink: 'https://mythoria.test/pt-PT/survey/reward/ent-1',
          redemptionDeadline: expect.any(String),
        }),
      }),
    );
  });

  it('uses the unlocked template and entity id', async () => {
    await sendFirstStoryUnlockedEmails(['ent-1']);
    expect(sendTemplatedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'survey-reward-first-story-unlocked',
        entityId: 'survey-reward-unlocked:ent-1',
      }),
    );
  });

  it('sends the audiobook-ready email with the story listen link only for audiobook gifts', async () => {
    getRewardEmailContextsMock.mockResolvedValue([
      context(),
      context({ entitlementId: 'ent-2', rewardType: 'pdf' }),
    ]);
    await expect(sendAudiobookReadyEmails(['ent-1', 'ent-2'])).resolves.toEqual({
      sent: 1,
      failed: 0,
    });
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTemplatedEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'survey-reward-audiobook-ready',
        entityId: 'survey-reward-audio-ready:ent-1',
        variables: {
          name: 'Ana',
          storyTitle: 'A Lua',
          listenLink: 'https://mythoria.test/pt-PT/stories/listen/story-1',
        },
      }),
    );
  });

  it('counts failures without throwing', async () => {
    getRewardEmailContextsMock.mockResolvedValue([context(), context({ entitlementId: 'ent-2' })]);
    sendTemplatedEmailMock
      .mockResolvedValueOnce({ success: false, error: 'nope' })
      .mockRejectedValueOnce(new Error('boom'));
    await expect(sendRewardAvailableEmails(['ent-1', 'ent-2'])).resolves.toEqual({
      sent: 0,
      failed: 2,
    });
  });

  it('survives a recipient lookup failure and skips empty input', async () => {
    getRewardEmailContextsMock.mockRejectedValue(new Error('db'));
    await expect(sendRewardAvailableEmails(['ent-1'])).resolves.toEqual({ sent: 0, failed: 1 });
    await expect(sendRewardAvailableEmails([])).resolves.toEqual({ sent: 0, failed: 0 });
    expect(sendTemplatedEmailMock).not.toHaveBeenCalled();
  });
});

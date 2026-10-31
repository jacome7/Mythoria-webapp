/** @jest-environment node */

const updateStoryMock = jest.fn();
const publishAudiobookRequestMock = jest.fn();
const compensateMock = jest.fn();
const markQueuedMock = jest.fn();

jest.mock('@/db/services', () => ({
  storyService: { updateStory: (...args: unknown[]) => updateStoryMock(...args) },
}));
jest.mock('@/lib/pubsub', () => ({
  publishAudiobookRequest: (...args: unknown[]) => publishAudiobookRequestMock(...args),
}));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
jest.mock('@/lib/product-generation', () => ({
  compensateProductGeneration: (...args: unknown[]) => compensateMock(...args),
  markProductGenerationQueued: (...args: unknown[]) => markQueuedMock(...args),
}));

import { launchAudiobookWorkflow } from './product-launch';

const params = { storyId: 'story-1', runId: 'run-1', voice: 'nova', includeBackgroundMusic: true };

describe('launchAudiobookWorkflow failure path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    publishAudiobookRequestMock.mockRejectedValue(new Error('pubsub down'));
  });

  it('compensates and reverts the story status when the request is still pending', async () => {
    compensateMock.mockResolvedValue(true);
    await expect(launchAudiobookWorkflow(params)).resolves.toEqual({ ok: false });
    expect(compensateMock).toHaveBeenCalledWith('run-1', 'queue', 'pubsub_publish_failed');
    expect(updateStoryMock).toHaveBeenLastCalledWith('story-1', { audiobookStatus: null });
  });

  it('does not revert the story status when a concurrent launcher already queued the run', async () => {
    compensateMock.mockResolvedValue(false);
    await expect(launchAudiobookWorkflow(params)).resolves.toEqual({ ok: false });
    expect(updateStoryMock).toHaveBeenCalledTimes(1);
    expect(updateStoryMock).not.toHaveBeenCalledWith('story-1', { audiobookStatus: null });
  });
});

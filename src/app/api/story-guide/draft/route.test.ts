/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { storyService, StoryDraftOwnershipError } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { isStoryTemplatesEnabledForAuthor } from '@/lib/story-templates/feature';
import { linkReferralFromRequest } from '@/lib/referrals/http';

jest.mock('@/db/services', () => ({
  storyService: { createStory: jest.fn() },
  StoryDraftOwnershipError: class extends Error {},
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/lib/story-templates/feature', () => ({ isStoryTemplatesEnabledForAuthor: jest.fn() }));
jest.mock('@/lib/referrals/http', () => ({ linkReferralFromRequest: jest.fn() }));

const draftId = 'e23a1f19-cce9-4b55-a9b7-9696a137fa97';
const body = { draftId, title: 'Draft', plotDescription: 'A story', storyLanguage: 'en-US' };
const request = (value: unknown = body) =>
  new NextRequest('https://mythoria.pt/api/story-guide/draft', {
    method: 'POST',
    body: JSON.stringify(value),
  });
type Story = Awaited<ReturnType<typeof storyService.createStory>>;

describe('guided story draft API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isStoryTemplatesEnabledForAuthor).mockReturnValue(true);
    jest
      .mocked(getCurrentAuthor)
      .mockResolvedValue({ authorId: 'author-1' } as NonNullable<
        Awaited<ReturnType<typeof getCurrentAuthor>>
      >);
    jest.mocked(storyService.createStory).mockResolvedValue({
      storyId: draftId,
      authorId: 'author-1',
      status: 'temporary',
      storyGenerationStatus: null,
    } as Story);
  });

  it('uses the stable identity on retries and links attribution before creation', async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    for (const [input] of jest.mocked(storyService.createStory).mock.calls) {
      expect(input).toEqual({
        storyId: draftId,
        authorId: 'author-1',
        title: 'Draft',
        plotDescription: 'A story',
        storyLanguage: 'en-US',
        status: 'temporary',
      });
    }
    expect(jest.mocked(linkReferralFromRequest).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(storyService.createStory).mock.invocationCallOrder[0],
    );
  });

  it('is hidden while disabled', async () => {
    jest.mocked(isStoryTemplatesEnabledForAuthor).mockReturnValue(false);
    expect((await POST(request())).status).toBe(404);
    expect(getCurrentAuthor).toHaveBeenCalled();
  });

  it('passes the authenticated author to the access check', async () => {
    await POST(request());
    expect(isStoryTemplatesEnabledForAuthor).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'author-1' }),
    );
  });

  it('requires authentication', async () => {
    jest.mocked(getCurrentAuthor).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(storyService.createStory).not.toHaveBeenCalled();
  });

  it.each([
    { draftId: 'bad' },
    { title: '' },
    { title: 'x'.repeat(301) },
    { plotDescription: 'x'.repeat(40001) },
    { storyLanguage: 'xx-XX' },
    { authorId: 'other' },
  ])('rejects invalid input %j', async (invalid) => {
    expect((await POST(request({ ...body, ...invalid }))).status).toBe(400);
    expect(storyService.createStory).not.toHaveBeenCalled();
    expect(linkReferralFromRequest).not.toHaveBeenCalled();
  });

  it('does not expose cross-owner collisions', async () => {
    jest.mocked(storyService.createStory).mockRejectedValue(new StoryDraftOwnershipError());
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  it.each([
    { status: 'published' },
    { status: 'writing' },
    { storyGenerationStatus: 'queued' },
    { storyGenerationStatus: 'running' },
    { storyGenerationStatus: 'completed' },
  ])('rejects ineligible draft %j', async (state) => {
    jest.mocked(storyService.createStory).mockResolvedValue({
      storyId: draftId,
      authorId: 'author-1',
      status: 'draft',
      ...state,
    } as Story);
    expect((await POST(request())).status).toBe(409);
  });
});

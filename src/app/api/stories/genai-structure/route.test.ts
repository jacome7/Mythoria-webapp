/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/db/services', () => ({
  storyService: { getStoryById: jest.fn(), updateStory: jest.fn() },
}));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));

const storyId = '2042e134-7f04-43f3-99de-a043139ee4ee';
const body = { storyId, userDescription: 'A child discovers a magical doorway.', locale: 'en-US' };
const reference = {
  questionId: 'protagonist',
  question: 'Quem é a personagem principal?',
  answer: 'A Ana',
  imageObjectPath: 'inputs/ana.jpg',
  sourceCharacterIndex: 0,
  targetRole: 'protagonist',
};
const photoBody = {
  ...body,
  locale: 'pt-PT',
  imageObjectPaths: [reference.imageObjectPath],
  characterReferences: [reference],
};
const request = (value: unknown = body) =>
  new NextRequest('https://mythoria.pt/api/stories/genai-structure', {
    method: 'POST',
    body: JSON.stringify(value),
  });
type Story = NonNullable<Awaited<ReturnType<typeof storyService.getStoryById>>>;
const draft = {
  storyId,
  authorId: 'trusted-author',
  status: 'temporary',
  storyGenerationStatus: null,
} as Story;

describe('story structure API template extension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(getCurrentAuthor)
      .mockResolvedValue({ authorId: 'trusted-author' } as NonNullable<
        Awaited<ReturnType<typeof getCurrentAuthor>>
      >);
    jest.mocked(storyService.getStoryById).mockResolvedValue(draft);
    jest
      .mocked(sgwFetch)
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ success: true, jobId: 'job-1', estimatedDuration: 10 })),
      );
  });
  afterEach(() => jest.restoreAllMocks());

  it.each(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
    'forwards a validated photo reference in %s',
    async (locale) => {
      expect((await POST(request({ ...photoBody, locale }))).status).toBe(200);
      const payload = JSON.parse(String(jest.mocked(sgwFetch).mock.calls[0][1]?.body));
      expect(payload.characterReferences).toEqual([reference]);
      expect(payload.imageObjectPaths).toEqual([reference.imageObjectPath]);
    },
  );

  it.each([
    { imageObjectPaths: ['inputs/other.jpg'] },
    { imageObjectPaths: [] },
    { characterReferences: [reference, reference] },
    { characterReferences: [{ ...reference, sourceCharacterIndex: -1 }] },
    { characterReferences: [{ ...reference, sourceCharacterIndex: 50 }] },
    { characterReferences: [{ ...reference, sourceCharacterIndex: 0.5 }] },
    { characterReferences: [{ ...reference, targetRole: 'supporting' }] },
    { characterReferences: [{ ...reference, extra: 'unexpected' }] },
  ])('rejects invalid photo references %j', async (invalid) => {
    expect((await POST(request({ ...photoBody, ...invalid }))).status).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('checks story ownership', async () => {
    jest.mocked(storyService.getStoryById).mockResolvedValue({ ...draft, authorId: 'other' });
    expect((await POST(request(photoBody))).status).toBe(404);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'allows experimental preference %s',
    async (experimentalFeaturesEnabled) => {
      jest.mocked(getCurrentAuthor).mockResolvedValue({
        authorId: 'trusted-author',
        experimentalFeaturesEnabled,
      } as NonNullable<Awaited<ReturnType<typeof getCurrentAuthor>>>);
      expect((await POST(request(photoBody))).status).toBe(200);
    },
  );

  it('requires authentication before any story or upstream request', async () => {
    jest.mocked(getCurrentAuthor).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(storyService.getStoryById).not.toHaveBeenCalled();
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('keeps the existing freeform request working', async () => {
    expect((await POST(request())).status).toBe(200);
    expect(JSON.parse(String(jest.mocked(sgwFetch).mock.calls[0][1]?.body))).toEqual(body);
  });

  it('checks ownership before attempting rollback recovery', async () => {
    jest
      .mocked(storyService.getStoryById)
      .mockResolvedValue({ ...draft, authorId: 'another-author' });
    expect(
      (
        await POST(
          request({
            ...body,
            structureRequestId: '096c4dc2-1b2a-42c5-9e92-c05cd4f76c93',
            storyPreferences: {},
          }),
        )
      ).status,
    ).toBe(404);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it.each([
    { storyPreferences: { targetAudience: 'unknown' } },
    { storyPreferences: { graphicalStyle: 'unknown' } },
    { storyPreferences: { novelStyle: 'unknown' } },
    { storyPreferences: { tone: 'x'.repeat(121) } },
    { storyPreferences: { systemPrompt: 'override' } },
    { factuality: 'fiction' },
    { factuality: 'invent-real-facts' },
  ])('rejects invalid preference or factuality fields %j', async (fields) => {
    expect((await POST(request({ ...body, ...fields }))).status).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('forwards canonical preferences and factuality without trusting a supplied author', async () => {
    const storyPreferences = {
      targetAudience: 'all_ages',
      novelStyle: 'biography',
      graphicalStyle: 'watercolor',
      tone: '  Warm  ',
    };
    expect(
      (
        await POST(
          request({ ...body, authorId: 'spoofed', storyPreferences, factuality: 'memory' }),
        )
      ).status,
    ).toBe(200);
    const [url, options] = jest.mocked(sgwFetch).mock.calls[0];
    expect(url).toBe('/api/jobs/story-structure');
    const payload = JSON.parse(String(options?.body));
    expect(payload.storyPreferences).toEqual({ ...storyPreferences, tone: 'Warm' });
    expect(payload.factuality).toBe('memory');
    expect(payload.authorId).toBeUndefined();
    expect(storyService.updateStory).toHaveBeenCalledWith(storyId, { status: 'draft' });
  });

  it.each([null, { ...draft, authorId: 'someone-else' }])(
    'does not structure a missing or differently owned story',
    async (story) => {
      jest
        .mocked(storyService.getStoryById)
        .mockResolvedValue(
          story as unknown as Awaited<ReturnType<typeof storyService.getStoryById>>,
        );
      expect((await POST(request())).status).toBe(404);
      expect(sgwFetch).not.toHaveBeenCalled();
      expect(storyService.updateStory).not.toHaveBeenCalled();
    },
  );

  it.each([
    { status: 'published' },
    { status: 'writing' },
    { storyGenerationStatus: 'queued' },
    { storyGenerationStatus: 'running' },
    { storyGenerationStatus: 'completed' },
  ])('rejects a story that is no longer an unfinished draft %j', async (state) => {
    jest.mocked(storyService.getStoryById).mockResolvedValue({ ...draft, ...state } as Story);
    expect((await POST(request())).status).toBe(409);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('allows media-only input and does not repromote an existing draft', async () => {
    jest
      .mocked(storyService.getStoryById)
      .mockResolvedValue({ ...draft, status: 'draft' } as Story);
    expect((await POST(request({ storyId, audioObjectPath: 'audio/clip.webm' }))).status).toBe(200);
    expect(storyService.updateStory).not.toHaveBeenCalled();
  });

  it('requires both a story identity and some contribution', async () => {
    expect((await POST(request({ userDescription: 'An idea' }))).status).toBe(400);
    expect(
      (await POST(request({ storyId, userDescription: '   ', imageObjectPaths: [] }))).status,
    ).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('returns a client error for malformed JSON and non-string descriptions', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const badJson = new NextRequest('https://mythoria.pt/api/stories/genai-structure', {
      method: 'POST',
      body: '{bad',
    });
    expect((await POST(badJson)).status).toBe(400);
    expect((await POST(request({ ...body, userDescription: 42 }))).status).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('never promotes a draft after upstream rejection', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .mocked(sgwFetch)
      .mockResolvedValue(new Response(JSON.stringify({ error: 'busy' }), { status: 503 }));
    expect((await POST(request())).status).toBe(503);
    expect(storyService.updateStory).not.toHaveBeenCalled();
  });

  it('preserves a validated structure request identity on retries', async () => {
    const structureRequestId = '096c4dc2-1b2a-42c5-9e92-c05cd4f76c93';
    expect((await POST(request({ ...body, structureRequestId }))).status).toBe(200);
    expect((await POST(request({ ...body, structureRequestId }))).status).toBe(200);
    for (const [, options] of jest.mocked(sgwFetch).mock.calls) {
      expect(JSON.parse(String(options?.body)).structureRequestId).toBe(structureRequestId);
    }
  });

  it.each([
    { structureRequestId: 'invalid' },
    { storyId: 'invalid' },
    { userDescription: 'x'.repeat(40_001) },
    { imageObjectPaths: ['one', 'two', 'three', 'four'] },
    { characterIds: ['not-a-uuid'] },
    { locale: 'it-IT' },
  ])('rejects malformed structure input %j', async (invalid) => {
    expect((await POST(request({ ...body, ...invalid }))).status).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('does not reflect private upstream error bodies', async () => {
    jest
      .mocked(sgwFetch)
      .mockResolvedValue(
        new Response(JSON.stringify({ prompt: 'private author memory' }), { status: 503 }),
      );
    const response = await POST(request());
    expect(await response.text()).not.toContain('private author memory');
  });

  it('rejects malformed upstream JSON without promoting the draft', async () => {
    jest.mocked(sgwFetch).mockResolvedValue(new Response('invalid JSON'));
    expect((await POST(request())).status).toBe(502);
    expect(storyService.updateStory).not.toHaveBeenCalled();
  });
});

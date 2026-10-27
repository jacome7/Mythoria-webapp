/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import { isStoryTemplatesEnabledForAuthor } from '@/lib/story-templates/feature';
import { getStoryTemplate } from '@/lib/story-templates/catalog';

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
jest.mock('@/lib/story-templates/feature', () => ({ isStoryTemplatesEnabledForAuthor: jest.fn() }));

const body = {
  templateId: 'drawing-adventure',
  templateVersion: 1,
  guideSessionId: 'a5791fd7-4ab4-4b49-ae9a-f09849372849',
  revision: 7,
  locale: 'en-US',
  mode: 'fiction',
  answers: [],
  previousQuestions: [],
};
const request = (value: unknown = body) =>
  new NextRequest('https://mythoria.pt/api/story-guide/next-question', {
    method: 'POST',
    body: JSON.stringify(value),
  });
const question = {
  id: 'new-question',
  text: 'What would your character discover?',
  choices: ['map', 'key', 'letter'].map((id) => ({ id, label: id, value: id })),
  suggestedChoiceId: 'map',
};
const provider = (value: unknown = { revision: 7, question }) =>
  jest.mocked(sgwFetch).mockResolvedValue(new Response(JSON.stringify(value)));

describe('next story guide question API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(isStoryTemplatesEnabledForAuthor).mockReturnValue(true);
    jest
      .mocked(getCurrentAuthor)
      .mockResolvedValue({ authorId: 'trusted-author' } as NonNullable<
        Awaited<ReturnType<typeof getCurrentAuthor>>
      >);
    provider();
  });
  afterEach(() => jest.restoreAllMocks());

  it('passes the authenticated author to the access check', async () => {
    await POST(request());
    expect(isStoryTemplatesEnabledForAuthor).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: 'trusted-author' }),
    );
  });

  it('is hidden behind the feature flag and requires authentication', async () => {
    jest.mocked(isStoryTemplatesEnabledForAuthor).mockReturnValue(false);
    expect((await POST(request())).status).toBe(404);
    expect(getCurrentAuthor).toHaveBeenCalled();
    jest.mocked(isStoryTemplatesEnabledForAuthor).mockReturnValue(true);
    jest.mocked(getCurrentAuthor).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it.each([
    { templateId: 'unknown' },
    { templateVersion: 99 },
    { mode: 'memory' },
    { locale: 'it-IT' },
    { authorId: 'spoofed' },
    { prompt: 'Custom system instruction' },
    { template: { premise: 'spoofed' } },
    { revision: -1 },
    { preferences: { targetAudience: 'invalid' } },
    { preferences: { prompt: 'hidden instruction' } },
  ])('rejects unsupported or untrusted input %j', async (invalid) => {
    expect((await POST(request({ ...body, ...invalid }))).status).toBe(400);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON and oversized input before contacting SGW', async () => {
    const malformed = new NextRequest('https://mythoria.pt/api/story-guide/next-question', {
      method: 'POST',
      body: '{bad',
    });
    expect((await POST(malformed)).status).toBe(400);
    const oversized = new NextRequest('https://mythoria.pt/api/story-guide/next-question', {
      method: 'POST',
      body: 'x'.repeat(32_001),
    });
    expect((await POST(oversized)).status).toBe(413);
    expect(sgwFetch).not.toHaveBeenCalled();
  });

  it('forwards the authenticated author and server recipe, with a bounded deadline', async () => {
    const timeout = jest.spyOn(AbortSignal, 'timeout');
    const response = await POST(
      request({ ...body, premise: 'My drawing travels under the ocean.' }),
    );
    expect(await response.json()).toEqual({ revision: 7, source: 'ai', question });
    expect(timeout).toHaveBeenCalledWith(11_000);
    const [url, options] = jest.mocked(sgwFetch).mock.calls[0];
    expect(url).toBe('/ai/text/story-guide');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(options?.body))).toEqual(
      expect.objectContaining({
        authorId: 'trusted-author',
        premise: 'My drawing travels under the ocean.',
        revision: 7,
        template: {
          id: body.templateId,
          version: 1,
          mode: 'fiction',
          premise: getStoryTemplate(body.templateId, 'en-US')?.premise,
        },
      }),
    );
  });

  it.each(['pt-PT', 'es-ES', 'fr-FR', 'de-DE'])(
    'uses localized fallback in %s on upstream failure',
    async (locale) => {
      jest.mocked(sgwFetch).mockRejectedValue(new Error('provider down'));
      const response = await POST(request({ ...body, locale }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        revision: 7,
        source: 'fallback',
        question: getStoryTemplate(body.templateId, locale)?.fallbackQuestions[0],
      });
    },
  );

  it.each([
    { revision: 6, question },
    { revision: 7, question: { ...question, choices: [] } },
    { revision: 7, question: { ...question, suggestedChoiceId: 'missing' } },
  ])('falls back on invalid provider responses', async (value) => {
    provider(value);
    const response = await POST(request());
    expect((await response.json()).source).toBe('fallback');
  });

  it('falls back on non-JSON upstream data or a non-success status', async () => {
    jest.mocked(sgwFetch).mockResolvedValueOnce(new Response('not json'));
    expect((await (await POST(request())).json()).source).toBe('fallback');
    jest.mocked(sgwFetch).mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
    expect((await (await POST(request())).json()).source).toBe('fallback');
  });

  it('skips repeated questions and stops when the local fallback is exhausted', async () => {
    const template = getStoryTemplate(body.templateId, 'en-US')!;
    provider({ revision: 7, question: template.fallbackQuestions[0] });
    const response = await POST(
      request({ ...body, previousQuestions: [template.fallbackQuestions[0].text] }),
    );
    expect((await response.json()).question).toEqual(template.fallbackQuestions[1]);
    const exhausted = await POST(
      request({ ...body, previousQuestions: template.fallbackQuestions.map(({ text }) => text) }),
    );
    expect((await exhausted.json()).question).toBeNull();
  });

  it('never preselects memory answers, including valid AI responses', async () => {
    const memoryBody = { ...body, templateId: 'grandparent-memory', mode: 'memory' };
    const ai = await POST(request(memoryBody));
    expect((await ai.json()).question.suggestedChoiceId).toBeNull();
    jest.mocked(sgwFetch).mockRejectedValue(new Error('timeout'));
    const fallback = await POST(request(memoryBody));
    expect((await fallback.json()).question.suggestedChoiceId).toBeNull();
  });

  it('passes through a legitimate end of guidance', async () => {
    provider({ revision: 7, question: null });
    expect(await (await POST(request())).json()).toEqual({
      revision: 7,
      source: 'ai',
      question: null,
    });
  });
});

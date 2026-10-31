import { NextRequest } from 'next/server';
import { createSurveyToken } from '@/lib/surveys/tokens';

const mockResolveInvitation = jest.fn();
const mockMarkOpened = jest.fn();
const mockSaveProgress = jest.fn();
const mockSubmitResponse = jest.fn();

jest.mock('@/db/services/survey-responses', () => ({
  MAX_SUBMISSION_KEY_LENGTH: 128,
  resolveInvitation: (...args: unknown[]) => mockResolveInvitation(...args),
  markOpened: (...args: unknown[]) => mockMarkOpened(...args),
  saveProgress: (...args: unknown[]) => mockSaveProgress(...args),
  submitResponse: (...args: unknown[]) => mockSubmitResponse(...args),
}));

jest.mock('@/lib/surveys/respondent-logger', () => ({
  surveyRespondentLogger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { GET } from './route';
import { POST as postProgress } from './progress/route';
import { POST as postSubmit } from './submit/route';

const SECRET = 'test-secret-test-secret-test-secret-00';
const INVITATION_ID = '00000000-0000-4000-8000-000000000001';

beforeAll(() => {
  process.env.SURVEY_LINK_SECRET = SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
});

const token = () => createSurveyToken(INVITATION_ID, SECRET);
const ctx = (value: string) => ({ params: Promise.resolve({ token: value }) });

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://mythoria.pt/api/surveys/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('GET /api/surveys/[token]', () => {
  it('returns a uniform 404 for invalid tokens', async () => {
    mockResolveInvitation.mockResolvedValue({ state: 'invalid' });
    const response = await GET(new Request('https://mythoria.pt/api/surveys/x'), ctx('x'));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('returns the state for valid tokens', async () => {
    mockResolveInvitation.mockResolvedValue({ state: 'closed' });
    const response = await GET(new Request('https://mythoria.pt/api/surveys/t'), ctx(token()));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state: 'closed' });
  });

  it('answers 500 with a generic body when the service throws', async () => {
    mockResolveInvitation.mockRejectedValue(new Error('db down'));
    const response = await GET(new Request('https://mythoria.pt/api/surveys/t'), ctx(token()));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'server_error' });
  });
});

describe('POST /api/surveys/[token]/progress', () => {
  const answers = { Q1: { kind: 'choice', optionIds: ['yes'] } };

  it('returns 404 for forged tokens without calling the service', async () => {
    const response = await postProgress(post('x/progress', { answers }), ctx('forged'));
    expect(response.status).toBe(404);
    expect(mockSaveProgress).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON, empty bodies and unknown fields', async () => {
    expect((await postProgress(post('t/progress', '{nope'), ctx(token()))).status).toBe(400);
    expect((await postProgress(post('t/progress', {}), ctx(token()))).status).toBe(400);
    expect(
      (await postProgress(post('t/progress', { answers, extra: 1 }), ctx(token()))).status,
    ).toBe(400);
  });

  it('rejects oversized bodies', async () => {
    const response = await postProgress(
      post('t/progress', JSON.stringify({ answers: { Q1: 'x'.repeat(300_000) } })),
      ctx(token()),
    );
    expect(response.status).toBe(413);
  });

  it('marks the invitation opened for the opened event', async () => {
    mockMarkOpened.mockResolvedValue(true);
    const response = await postProgress(post('t/progress', { event: 'opened' }), ctx(token()));
    expect(response.status).toBe(200);
    expect(mockMarkOpened).toHaveBeenCalledWith(INVITATION_ID);
  });

  it('saves drafts and maps service failures to statuses', async () => {
    mockSaveProgress.mockResolvedValueOnce({ ok: true });
    expect((await postProgress(post('t/progress', { answers }), ctx(token()))).status).toBe(200);
    expect(mockSaveProgress).toHaveBeenCalledWith(INVITATION_ID, answers);

    mockSaveProgress.mockResolvedValueOnce({ ok: false, reason: 'closed' });
    expect((await postProgress(post('t/progress', { answers }), ctx(token()))).status).toBe(409);

    mockSaveProgress.mockResolvedValueOnce({ ok: false, reason: 'submitted' });
    expect((await postProgress(post('t/progress', { answers }), ctx(token()))).status).toBe(409);

    mockSaveProgress.mockResolvedValueOnce({ ok: false, reason: 'invalid' });
    expect((await postProgress(post('t/progress', { answers }), ctx(token()))).status).toBe(404);

    mockSaveProgress.mockResolvedValueOnce({ ok: false, reason: 'invalid_answers' });
    expect((await postProgress(post('t/progress', { answers }), ctx(token()))).status).toBe(400);
  });
});

describe('POST /api/surveys/[token]/submit', () => {
  const answers = { Q1: { kind: 'choice', optionIds: ['yes'] } };

  it('returns 404 for forged tokens', async () => {
    const response = await postSubmit(
      post('x/submit', { answers }, { 'idempotency-key': 'k' }),
      ctx('forged'),
    );
    expect(response.status).toBe(404);
    expect(mockSubmitResponse).not.toHaveBeenCalled();
  });

  it('requires an Idempotency-Key of at most 128 characters', async () => {
    expect((await postSubmit(post('t/submit', { answers }), ctx(token()))).status).toBe(400);
    expect(
      (
        await postSubmit(
          post('t/submit', { answers }, { 'idempotency-key': 'k'.repeat(129) }),
          ctx(token()),
        )
      ).status,
    ).toBe(400);
    expect(mockSubmitResponse).not.toHaveBeenCalled();
  });

  it('validates the body shape', async () => {
    const response = await postSubmit(
      post('t/submit', { nope: true }, { 'idempotency-key': 'k' }),
      ctx(token()),
    );
    expect(response.status).toBe(400);
  });

  it('returns the entitlement on success', async () => {
    mockSubmitResponse.mockResolvedValue({
      ok: true,
      alreadySubmitted: false,
      entitlementId: 'e-1',
      rewardStatus: 'eligible',
    });
    const t = token();
    const response = await postSubmit(
      post('t/submit', { answers }, { 'idempotency-key': 'k' }),
      ctx(t),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      alreadySubmitted: false,
      entitlementId: 'e-1',
      rewardStatus: 'eligible',
    });
    expect(mockSubmitResponse).toHaveBeenCalledWith(t, answers, 'k');
  });

  it('maps validation, closed, conflict and invalid results', async () => {
    mockSubmitResponse.mockResolvedValueOnce({
      ok: false,
      reason: 'validation',
      errors: { Q2: 'required' },
    });
    const validation = await postSubmit(
      post('t/submit', { answers }, { 'idempotency-key': 'k' }),
      ctx(token()),
    );
    expect(validation.status).toBe(422);
    expect(await validation.json()).toEqual({
      ok: false,
      error: 'validation',
      errors: { Q2: 'required' },
    });

    mockSubmitResponse.mockResolvedValueOnce({ ok: false, reason: 'closed' });
    expect(
      (await postSubmit(post('t/submit', { answers }, { 'idempotency-key': 'k' }), ctx(token())))
        .status,
    ).toBe(409);

    mockSubmitResponse.mockResolvedValueOnce({ ok: false, reason: 'key_conflict' });
    expect(
      (await postSubmit(post('t/submit', { answers }, { 'idempotency-key': 'k' }), ctx(token())))
        .status,
    ).toBe(409);

    mockSubmitResponse.mockResolvedValueOnce({ ok: false, reason: 'invalid' });
    expect(
      (await postSubmit(post('t/submit', { answers }, { 'idempotency-key': 'k' }), ctx(token())))
        .status,
    ).toBe(404);
  });
});

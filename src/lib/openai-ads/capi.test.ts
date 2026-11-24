/** @jest-environment node */
import {
  OPENAI_CAPI_TIMEOUT_MS,
  isOpenAiCapiConfigured,
  sendOpenAiEvents,
  type OpenAiCapiEvent,
} from './capi';

const ORIGINAL_ENV = { ...process.env };

const event: OpenAiCapiEvent = {
  id: 'order_order-1',
  type: 'order_created',
  timestamp_ms: 1_700_000_000_000,
  action_source: 'web',
  source_url: 'https://mythoria.pt/en-US/buy-credits',
  data: {
    type: 'contents',
    amount: 1000,
    currency: 'EUR',
    contents: [{ id: 'credits_10', quantity: 1, amount: 1000, currency: 'EUR' }],
  },
};

function mockFetchResponse(status: number, body = '') {
  const fetchMock = jest
    .fn()
    .mockResolvedValue(
      new Response(body || null, { status, headers: { 'Content-Type': 'application/json' } }),
    );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('OpenAI Conversions API transport', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.OPENAI_ADS_CAPI_DELIVERY_ENABLED = 'true';
    process.env.NEXT_PUBLIC_BASE_URL = 'https://mythoria.pt';
    process.env.OPENAI_ADS_CAPI_KEY = 'capi-key';
    process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID = 'pixel/id';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('is configured only when both the key and the pixel id are set', () => {
    expect(isOpenAiCapiConfigured()).toBe(true);
    process.env.OPENAI_ADS_CAPI_KEY = '';
    expect(isOpenAiCapiConfigured()).toBe(false);
    process.env.OPENAI_ADS_CAPI_KEY = 'capi-key';
    delete process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID;
    expect(isOpenAiCapiConfigured()).toBe(false);
  });

  it('posts the documented payload with bearer auth to the pixel endpoint', async () => {
    const fetchMock = mockFetchResponse(200, '{}');

    await expect(sendOpenAiEvents([event])).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://bzr.openai.com/v1/events?pid=pixel%2Fid');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: 'Bearer capi-key',
      'Content-Type': 'application/json',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(init.body)).toEqual({
      integration_source: 'mythoria-webapp',
      events: [event],
    });
  });

  it('classifies 400 as permanent and keeps a truncated error body', async () => {
    mockFetchResponse(400, 'x'.repeat(2000));

    const result = await sendOpenAiEvents([event]);

    expect(result).toMatchObject({ ok: false, status: 400, retryable: false });
    expect(result.ok ? '' : result.error).toHaveLength(500);
    expect(result.ok ? '' : result.error.startsWith('HTTP 400 x')).toBe(true);
  });

  it.each([429, 500, 503])('classifies HTTP %i as retryable', async (status) => {
    mockFetchResponse(status, 'busy');

    await expect(sendOpenAiEvents([event])).resolves.toMatchObject({
      ok: false,
      status,
      retryable: true,
    });
  });

  it('classifies network errors as retryable', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('socket hang up')) as unknown as typeof fetch;

    await expect(sendOpenAiEvents([event])).resolves.toEqual({
      ok: false,
      retryable: true,
      error: 'socket hang up',
    });
  });

  it('aborts after the timeout and reports a retryable error', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;

    const pending = sendOpenAiEvents([event]);
    jest.advanceTimersByTime(OPENAI_CAPI_TIMEOUT_MS);

    await expect(pending).resolves.toEqual({
      ok: false,
      retryable: true,
      error: `Request timed out after ${OPENAI_CAPI_TIMEOUT_MS}ms`,
    });
  });

  it('refuses batches larger than 1000 events without calling the API', async () => {
    const fetchMock = mockFetchResponse(200);

    const result = await sendOpenAiEvents(Array.from({ length: 1001 }, () => event));

    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the API when credentials are missing', async () => {
    delete process.env.OPENAI_ADS_CAPI_KEY;
    const fetchMock = mockFetchResponse(200);

    await expect(sendOpenAiEvents([event])).resolves.toMatchObject({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import type { NextRequest } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import { wizardMediaLogger } from '@/lib/wizard-media-logging';
import { POST as upload } from './route';
import { POST as analyze } from '../analyze-image/route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit) => ({ body, ...init }),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
jest.mock('winston', () => ({
  createLogger: () => ({ warn: jest.fn() }),
  format: { combine: jest.fn(), timestamp: jest.fn(), json: jest.fn() },
  transports: { Console: jest.fn() },
}));

const requestId = 'e20bb3b5-4bd9-45a3-bba6-03416750b89c';
const media = { kind: 'image', contentType: 'image/png', dataUrl: 'sensitive-data' };
const request = (body: unknown, id = requestId) =>
  ({ headers: new Headers({ 'x-request-id': id }), json: async () => body }) as NextRequest;

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getCurrentAuthor).mockResolvedValue({
    authorId: 'owner',
  } as NonNullable<Awaited<ReturnType<typeof getCurrentAuthor>>>);
});

it('forwards the same identifier for image upload and analysis', async () => {
  jest.mocked(sgwFetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ objectPath: 'owner/inputs/photo.webp' }),
  } as Response);

  for (const response of [
    await upload(request(media)),
    await analyze(request({ objectPath: 'owner/inputs/photo.webp' })),
  ]) {
    expect(response).toMatchObject({ status: 200, headers: { 'x-request-id': requestId } });
  }

  expect(sgwFetch).toHaveBeenNthCalledWith(
    1,
    '/ai/media/upload',
    expect.objectContaining({ headers: expect.objectContaining({ 'x-request-id': requestId }) }),
  );
  expect(sgwFetch).toHaveBeenNthCalledWith(
    2,
    '/ai/media/analyze-image',
    expect.objectContaining({ headers: expect.objectContaining({ 'x-request-id': requestId }) }),
  );
});

it('logs the failure stage and does not expose upstream messages or request contents', async () => {
  jest.mocked(sgwFetch).mockResolvedValue({ ok: false, status: 503 } as Response);
  expect(await upload(request(media))).toMatchObject({
    status: 503,
    body: { error: 'Story media upload failed' },
  });
  expect(wizardMediaLogger.warn).toHaveBeenCalledWith('wizard_media_request_failed', {
    requestId,
    operation: 'upload',
    stage: 'workflow_response',
    status: 503,
  });
});

it('replaces an invalid correlation identifier before logging a failed identity read', async () => {
  jest.mocked(getCurrentAuthor).mockRejectedValueOnce(new Error('private auth diagnostic'));
  expect(await upload(request(media, 'private marker'))).toMatchObject({
    status: 500,
    headers: { 'x-request-id': expect.stringMatching(/^[\da-f-]{36}$/) },
    body: { error: 'Story media upload failed' },
  });
  expect(sgwFetch).not.toHaveBeenCalled();
  expect(wizardMediaLogger.warn).toHaveBeenCalledWith('wizard_media_request_failed', {
    requestId: expect.stringMatching(/^[\da-f-]{36}$/),
    operation: 'upload',
    stage: 'identity',
    status: 500,
  });
});

it('forwards only bounded analysis failure codes and recovery actions', async () => {
  jest.mocked(sgwFetch).mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({
      code: 'provider_busy',
      error: 'private upstream detail',
      recovery: 'unsafe',
    }),
  } as Response);
  expect(await analyze(request({ objectPath: 'owner/inputs/photo.webp' }))).toMatchObject({
    status: 503,
    body: { error: 'Story media analysis failed', code: 'provider_busy', recovery: 'retry' },
  });
});

it('does not forward an unrecognized upstream error', async () => {
  jest.mocked(sgwFetch).mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({ code: 'private marker', error: 'private upstream detail' }),
  } as Response);
  expect(await analyze(request({ objectPath: 'owner/inputs/photo.webp' }))).toMatchObject({
    body: { error: 'Story media analysis failed', code: 'analysis_failed', recovery: 'retry' },
  });
});

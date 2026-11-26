/** @jest-environment node */
import type { NextRequest } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { sgwFetch } from '@/lib/sgw-client';
import { wizardMediaLogger } from '@/lib/wizard-media-logging';
import sharp from 'sharp';
import { storyInputMaxBytes } from '@/lib/story-input-size';
import { POST as legacyUpload } from '../signed-upload/route';
import { POST as upload } from './route';
import { POST as analyze } from '../analyze-image/route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit) => ({ body, ...init }),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: jest.fn() }));
jest.mock('@/lib/sgw-client', () => ({ sgwFetch: jest.fn() }));
const mockSave = jest.fn();
const mockFile = jest.fn();
jest.mock('@google-cloud/storage', () => ({
  Storage: class {
    bucket() {
      return { name: 'mythoria-generated-stories', file: mockFile };
    }
  },
}));
jest.mock('winston', () => ({
  createLogger: () => ({ warn: jest.fn() }),
  format: { combine: jest.fn(), timestamp: jest.fn(), json: jest.fn() },
  transports: { Console: jest.fn() },
}));

const requestId = 'e20bb3b5-4bd9-45a3-bba6-03416750b89c';
const assetId = '326d9c98-c59a-4c2a-9ae1-b6da61e34cf3';
const media = {
  kind: 'audio',
  contentType: 'audio/mpeg',
  dataUrl: 'data:audio/mpeg;base64,YXVkaW8=',
};
const request = (body: unknown, id = requestId) =>
  new Request('https://test.invalid/api/media/input-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': id, 'x-media-id': assetId },
    body: JSON.stringify(body),
  }) as NextRequest;
const binary = (bytes: Uint8Array<ArrayBuffer>, mime = 'audio/wav') =>
  new Request('https://test.invalid/api/media/input-upload', {
    method: 'POST',
    headers: { 'content-type': mime, 'x-media-id': assetId, 'x-media-kind': mime.split('/')[0] },
    body: bytes,
  }) as NextRequest;

beforeEach(() => {
  jest.resetAllMocks();
  mockFile.mockReturnValue({ save: mockSave });
  jest.mocked(getCurrentAuthor).mockResolvedValue({
    authorId: 'owner',
  } as NonNullable<Awaited<ReturnType<typeof getCurrentAuthor>>>);
});

it('preserves legacy JSON, authenticated owner, correlation ID and idempotent storage', async () => {
  mockSave.mockRejectedValueOnce({ code: 412 });
  const response = await legacyUpload(request({ ...media, authorId: 'untrusted' }));
  expect(response).toMatchObject({
    status: 200,
    headers: { 'x-request-id': requestId },
    body: {
      objectPath: 'owner/inputs/' + assetId + '.mp3',
      publicUrl:
        'https://storage.googleapis.com/mythoria-generated-stories/owner/inputs/' +
        assetId +
        '.mp3',
    },
  });
  expect(mockSave).toHaveBeenCalledWith(Buffer.from('audio'), {
    metadata: { contentType: 'audio/mpeg' },
    preconditionOpts: { ifGenerationMatch: 0 },
  });
});

it.each(['binary', 'legacy'])(
  'accepts exactly 16 MiB and rejects one byte more for %s',
  async (format) => {
    const makeRequest = (size: number) =>
      format === 'binary'
        ? binary(new Uint8Array(size))
        : request({ ...media, dataUrl: Buffer.alloc(size).toString('base64') });
    expect(await upload(makeRequest(storyInputMaxBytes))).toMatchObject({ status: 200 });
    expect(mockSave.mock.calls[0][0].length).toBe(storyInputMaxBytes);
    expect(await upload(makeRequest(storyInputMaxBytes + 1))).toMatchObject({
      status: 413,
      body: { code: 'file_too_large' },
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  },
);

it('stores a normalized JPEG without enlarging and retains the analysis request identifier', async () => {
  const png = await sharp({ create: { width: 2400, height: 600, channels: 3, background: '#fff' } })
    .png()
    .toBuffer();
  expect(await upload(binary(new Uint8Array(png), 'image/png'))).toMatchObject({
    status: 200,
    body: { objectPath: 'owner/inputs/' + assetId + '.jpg' },
  });
  expect(await sharp(mockSave.mock.calls[0][0]).metadata()).toMatchObject({
    format: 'jpeg',
    width: 2048,
    height: 512,
  });
  jest
    .mocked(sgwFetch)
    .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) } as Response);
  expect(await analyze(request({ objectPath: 'owner/inputs/photo.jpg' }))).toMatchObject({
    status: 200,
  });
  expect(sgwFetch).toHaveBeenCalledWith(
    '/ai/media/analyze-image',
    expect.objectContaining({ headers: expect.objectContaining({ 'x-request-id': requestId }) }),
  );
});

it('logs the failure stage without exposing storage diagnostics', async () => {
  mockSave.mockRejectedValueOnce(new Error('Sensitive details'));
  expect(await upload(request(media))).toMatchObject({
    status: 502,
    body: { error: 'Story media upload failed' },
  });
  expect(wizardMediaLogger.warn).toHaveBeenCalledWith('wizard_media_request_failed', {
    requestId,
    operation: 'upload',
    stage: 'storage',
    status: 502,
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

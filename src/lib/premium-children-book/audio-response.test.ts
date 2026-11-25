const downloadPremiumAudioMock = jest.fn<Promise<Buffer>, [unknown]>();
jest.mock('./storage', () => ({
  downloadPremiumAudio: (asset: unknown) => downloadPremiumAudioMock(asset),
}));

import { premiumAudioResponse } from './audio-response';
import { getCurrentPremiumAudiobook, getPremiumAudioMetadata } from './audiobook';

const storyId = 'eb417f3e-ffb1-4168-958e-ddc463ebb00f';
const revision = 'af14c317-c9c8-4922-87e2-67983cd2ae81';
const runId = 'd65bb5f3-204a-479d-b4df-9ee71f6c513e';
const digest = 'a'.repeat(64);
const track = {
  pageNumber: 7,
  duration: 3,
  audio: {
    key: `${storyId}/premium/revisions/${revision}/audiobooks/${runId}/page-7-${digest}.mp3`,
    sha256: digest,
    generation: '123',
    bytes: 4,
  },
};
const story = {
  storyId,
  status: 'published',
  features: {
    premiumBook: {
      version: 1,
      type: 'premium_children',
      state: 'published',
      revision,
      manifest: track.audio,
    },
  },
  audiobookUri: { type: 'premium_children', revision, runId, tracks: [track] },
};
const fullStory = {
  ...story,
  audiobookUri: {
    type: 'premium_children',
    revision,
    runId,
    duration: 30,
    audio: {
      ...track.audio,
      key: `${storyId}/premium/revisions/${revision}/audiobooks/${runId}/audiobook-${digest}.mp3`,
    },
  },
};

beforeEach(() => {
  downloadPremiumAudioMock.mockReset();
  downloadPremiumAudioMock.mockResolvedValue(Buffer.from('abcd'));
});

it('serves a range from the current audiobook with private cache controls', async () => {
  const request = new Request(`https://mythoria.test/audio/0?runId=${runId}`, {
    headers: { range: 'bytes=1-2' },
  });
  const response = await premiumAudioResponse(request, story, 0);
  expect(response.status).toBe(206);
  expect(response.headers.get('content-range')).toEqual('bytes 1-2/4');
  expect(response.headers.get('cache-control')).toEqual('private, no-store');
  await expect(response.text()).resolves.toBe('bc');
});

it('never reads storage for a stale run, draft, or unscoped asset', async () => {
  const current = new Request(`https://mythoria.test/audio/0?runId=${runId}`);
  const foreign = { ...track, audio: { ...track.audio, key: 'different-story/audio.mp3' } };
  const badStory = { ...story, audiobookUri: { ...story.audiobookUri, tracks: [foreign] } };
  const responses = await Promise.all([
    premiumAudioResponse(new Request('https://mythoria.test/audio/0?runId=old'), story, 0),
    premiumAudioResponse(current, { ...story, status: 'draft' }, 0),
    premiumAudioResponse(current, badStory, 0),
  ]);
  expect(responses.map(({ status }) => status)).toEqual([404, 404, 404]);
  expect(downloadPremiumAudioMock).not.toHaveBeenCalled();
});

it('exposes full narration metadata without the private asset reference', () => {
  const complete = getCurrentPremiumAudiobook(storyId, fullStory.features, fullStory.audiobookUri);
  expect(getPremiumAudioMetadata(complete)).toEqual({ runId, duration: 30 });
});

it('downloads the complete MP3 only at index zero of the current run', async () => {
  const request = new Request(`https://mythoria.test/audio/0?runId=${runId}&download=1`);
  expect((await premiumAudioResponse(request, fullStory, 1)).status).toBe(404);
  expect(downloadPremiumAudioMock).not.toHaveBeenCalled();
  const response = await premiumAudioResponse(request, fullStory, 0);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-length')).toBe('4');
  expect(response.headers.get('content-disposition')).toContain('attachment');
  await expect(response.text()).resolves.toBe('abcd');
  expect(downloadPremiumAudioMock).toHaveBeenCalledWith(fullStory.audiobookUri.audio);
});

it.each([
  ['bytes=2-', 206, 'bytes 2-3/4', 'cd'],
  ['bytes=-2', 206, 'bytes 2-3/4', 'cd'],
  ['bytes=4-', 416, 'bytes */4', ''],
  ['bytes=-', 416, 'bytes */4', ''],
] as const)('serves the full-file range %s', async (range, status, contentRange, content) => {
  const request = new Request(`https://mythoria.test/audio/0?runId=${runId}`, {
    headers: { range },
  });
  const response = await premiumAudioResponse(request, fullStory, 0);
  expect(response.status).toBe(status);
  expect(response.headers.get('content-range')).toBe(contentRange);
  expect(response.headers.get('content-disposition')).toBeNull();
  await expect(response.text()).resolves.toBe(content);
});

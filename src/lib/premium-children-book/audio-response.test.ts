const downloadPremiumPageAudioMock = jest.fn<Promise<Buffer>, [unknown]>();
jest.mock('./storage', () => ({
  downloadPremiumPageAudio: (asset: unknown) => downloadPremiumPageAudioMock(asset),
}));

import { premiumPageAudioResponse } from './audio-response';

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

beforeEach(() => {
  downloadPremiumPageAudioMock.mockReset();
  downloadPremiumPageAudioMock.mockResolvedValue(Buffer.from('abcd'));
});

it('serves a range from the current audiobook with private cache controls', async () => {
  const request = new Request(`https://mythoria.test/audio/0?runId=${runId}`, {
    headers: { range: 'bytes=1-2' },
  });
  const response = await premiumPageAudioResponse(request, story, 0);
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
    premiumPageAudioResponse(new Request('https://mythoria.test/audio/0?runId=old'), story, 0),
    premiumPageAudioResponse(current, { ...story, status: 'draft' }, 0),
    premiumPageAudioResponse(current, badStory, 0),
  ]);
  expect(responses.map(({ status }) => status)).toEqual([404, 404, 404]);
  expect(downloadPremiumPageAudioMock).not.toHaveBeenCalled();
});

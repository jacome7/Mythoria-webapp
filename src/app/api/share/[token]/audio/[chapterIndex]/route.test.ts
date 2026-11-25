/** @jest-environment node */
import { db } from '@/db';
import { premiumAudioResponse } from '@/lib/premium-children-book/audio-response';
import { GET } from './route';

const authMock = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({ auth: () => authMock() }));
jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('@/lib/premium-children-book/audio-response', () => ({
  premiumAudioResponse: jest.fn(),
}));

const token = '00000000-0000-4000-8000-000000000001';
const link = {
  storyId: 'eb417f3e-ffb1-4168-958e-ddc463ebb00f',
  status: 'published',
  expiresAt: new Date(Date.now() + 60_000),
  revoked: false,
};
const limit = jest.fn();
const select = jest.mocked(db.select);
const respond = jest.mocked(premiumAudioResponse);

function getAudio(requestToken = token) {
  const request = new Request(`https://mythoria.test/api/share/${requestToken}/audio/0?runId=run`, {
    headers: { range: 'bytes=0-' },
  });
  return GET(request, { params: Promise.resolve({ token: requestToken, chapterIndex: '0' }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockResolvedValue({ userId: 'reader' });
  select.mockReturnValue({
    from: () => ({ innerJoin: () => ({ where: () => ({ limit }) }) }),
  } as never);
  limit.mockResolvedValue([link]);
  respond.mockResolvedValue(new Response('audio', { status: 206 }));
});

it('serves the audiobook of the story attached to the active link', async () => {
  expect((await getAudio()).status).toBe(206);
  expect(respond).toHaveBeenCalledWith(expect.any(Request), link, 0);
});

it('denies anonymous and malformed link requests before reaching the media handler', async () => {
  authMock.mockResolvedValueOnce({ userId: null });
  expect((await getAudio()).status).toBe(404);
  expect((await getAudio('invalid')).status).toBe(404);
  expect(select).not.toHaveBeenCalled();
  expect(respond).not.toHaveBeenCalled();
});

it.each([[{ ...link, revoked: true }], [{ ...link, expiresAt: new Date(0) }], []])(
  'denies absent, expired or revoked links on every request',
  async (...links) => {
    limit.mockResolvedValueOnce(links);
    const response = await getAudio();
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(respond).not.toHaveBeenCalled();
  },
);

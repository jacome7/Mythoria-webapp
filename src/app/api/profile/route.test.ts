jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));
const getAuthor = jest.fn();
const returning = jest.fn();
const set = jest.fn(() => ({ where: () => ({ returning }) }));
const clerk = jest.fn();
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getAuthor() }));
jest.mock('@/db', () => ({ db: { update: () => ({ set }) } }));
jest.mock('@/db/schema', () => ({ authors: { authorId: 'id' } }));
jest.mock('drizzle-orm', () => ({ eq: jest.fn() }));
jest.mock('@clerk/nextjs/server', () => ({ clerkClient: () => clerk() }));
import type { NextRequest } from 'next/server';
import { GET, PATCH } from './route';

const author = { authorId: 'a', displayName: 'Name', experimentalFeaturesEnabled: false };
const request = (value: unknown) =>
  ({ json: async () => ({ experimentalFeaturesEnabled: value }) }) as NextRequest;
describe('/api/profile experimental preference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAuthor.mockResolvedValue(author);
    returning.mockResolvedValue([{ ...author, experimentalFeaturesEnabled: true }]);
  });
  it('includes the stored preference in GET', async () => {
    const result = await GET();
    expect((await result.json()).author.experimentalFeaturesEnabled).toBe(false);
  });
  it('requires authentication to read or change the preference', async () => {
    getAuthor.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await PATCH(request(true))).status).toBe(401);
    expect(set).not.toHaveBeenCalled();
  });
  it.each([null, 'true', 1, 0])('rejects non-boolean %p', async (value) => {
    const result = await PATCH(request(value));
    expect(result.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });
  it('updates the preference without syncing Clerk', async () => {
    const result = await PATCH(request(true));
    expect(result.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ experimentalFeaturesEnabled: true });
    expect((await result.json()).author.experimentalFeaturesEnabled).toBe(true);
    expect(clerk).not.toHaveBeenCalled();
  });
  it('persists an explicit opt-out', async () => {
    returning.mockResolvedValue([{ ...author, experimentalFeaturesEnabled: false }]);
    const result = await PATCH(request(false));
    expect(result.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ experimentalFeaturesEnabled: false });
    expect((await result.json()).author.experimentalFeaturesEnabled).toBe(false);
  });
});

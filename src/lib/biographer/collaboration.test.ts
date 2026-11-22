/** @jest-environment node */
const select = jest.fn();
const getCookie = jest.fn();
const getHeaders = jest.fn();
jest.mock('@/db', () => ({ db: { select: (...args: unknown[]) => select(...args) } }));
jest.mock('next/headers', () => ({
  cookies: async () => ({ get: getCookie }),
  headers: async () => getHeaders(),
}));
jest.mock('@/db/services/biographer', () => ({
  BiographerError: class extends Error {
    constructor(
      message: string,
      public status = 400,
    ) {
      super(message);
    }
  },
  ownedProject: jest.fn(),
}));
import { collaborationEnabled, guestSession, requireGuestOrigin } from './collaboration';
const projectId = '659d229b-1bb2-4984-9b82-dc525b5a2b2d';
const participantId = '1647cc97-eb3f-47b3-9957-57e573c34681';
const row = {
  invitation: {},
  project: { id: projectId, status: 'collecting' },
  participant: { id: participantId },
};
describe('contributor session boundaries', () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.BIOGRAPHER_ENABLED = 'true';
    process.env.BIOGRAPHER_COLLABORATION_ENABLED = 'true';
    process.env.BIOGRAPHER_PUBLIC_URL = 'https://app.example';
    getCookie.mockReturnValue({ value: 'a'.repeat(43) });
    getHeaders.mockReturnValue(
      new Headers({ 'x-biographer-project': projectId, 'x-biographer-participant': participantId }),
    );
    const chain = { innerJoin: jest.fn(), where: jest.fn().mockResolvedValue([row]) };
    chain.innerJoin.mockReturnValue(chain);
    select.mockReturnValue({ from: () => chain });
  });
  afterEach(() => {
    process.env = { ...original };
    jest.clearAllMocks();
  });
  it('refuses writes when collaboration is disabled', () => {
    process.env.BIOGRAPHER_COLLABORATION_ENABLED = 'false';
    expect(() => collaborationEnabled()).toThrow('Not found');
  });
  it('requires explicit expected project and participant binding to match the session', async () => {
    await expect(guestSession()).resolves.toMatchObject(row);
    getHeaders.mockReturnValue(
      new Headers({
        'x-biographer-project': 'another-project',
        'x-biographer-participant': participantId,
      }),
    );
    await expect(guestSession()).rejects.toMatchObject({ status: 409 });
    getHeaders.mockReturnValue(new Headers());
    await expect(guestSession()).rejects.toMatchObject({ status: 409 });
  });
  it('rejects a different request origin for guest mutations', () => {
    expect(() =>
      requireGuestOrigin(
        new Request('https://app.example/api', { headers: { origin: 'https://other.example' } }),
      ),
    ).toThrow('Forbidden');
    expect(() =>
      requireGuestOrigin(
        new Request('https://app.example/api', { headers: { origin: 'https://app.example' } }),
      ),
    ).not.toThrow();
  });
});

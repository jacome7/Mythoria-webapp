import { ClerkAPIResponseError } from '@clerk/nextjs/errors';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { authorService } from '@/db/services';
import { getCurrentAuthor } from './auth';

jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }));
jest.mock('@/db', () => ({ db: { select: jest.fn() } }));
jest.mock('@/db/schema', () => ({ authors: { clerkUserId: 'clerk-user-id' } }));
jest.mock('@/db/services', () => ({ authorService: { syncUserOnSignIn: jest.fn() } }));

const readUser = jest.mocked(currentUser);
const syncUser = jest.mocked(authorService.syncUserOnSignIn);
const user = { id: 'user-test' } as NonNullable<Awaited<ReturnType<typeof currentUser>>>;

function clerkError(status: number) {
  return new ClerkAPIResponseError('Clerk backend response', { data: [], status });
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => ({ limit: async () => [] }) }),
  } as unknown as ReturnType<typeof db.select>);
});

it('retries transient Clerk reads before author synchronization', async () => {
  readUser.mockRejectedValueOnce(clerkError(503)).mockResolvedValueOnce(user);
  await getCurrentAuthor();
  expect(readUser).toHaveBeenCalledTimes(2);
  expect(syncUser).toHaveBeenCalledTimes(1);
  expect(syncUser).toHaveBeenCalledWith(user);
});

it('retries a Clerk transport failure with no response status', async () => {
  const transportError = new ClerkAPIResponseError('', {
    data: [{ code: 'unexpected_error', message: 'fetch failed' }],
    status: 0,
  });
  Object.defineProperty(transportError, 'status', { value: undefined });
  readUser.mockRejectedValueOnce(transportError).mockResolvedValueOnce(user);
  await getCurrentAuthor();
  expect(readUser).toHaveBeenCalledTimes(2);
  expect(syncUser).toHaveBeenCalledTimes(1);
});

it('preserves permanent Clerk failures without accessing the author database', async () => {
  const error = clerkError(403);
  readUser.mockRejectedValue(error);
  await expect(getCurrentAuthor()).rejects.toBe(error);
  expect(readUser).toHaveBeenCalledTimes(1);
  expect(db.select).not.toHaveBeenCalled();
});

it('stops after the second transient failure', async () => {
  const error = clerkError(502);
  readUser.mockRejectedValue(error);
  await expect(getCurrentAuthor()).rejects.toBe(error);
  expect(readUser).toHaveBeenCalledTimes(2);
  expect(syncUser).not.toHaveBeenCalled();
});

it('does not retry an author database mutation', async () => {
  const error = new Error('Database unavailable');
  readUser.mockResolvedValueOnce(user);
  syncUser.mockRejectedValueOnce(error);
  await expect(getCurrentAuthor()).rejects.toBe(error);
  expect(readUser).toHaveBeenCalledTimes(1);
  expect(syncUser).toHaveBeenCalledTimes(1);
});

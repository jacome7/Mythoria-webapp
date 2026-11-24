/** @jest-environment node */
const valuesMock = jest.fn();
const nothingMock = jest.fn();
const transactionMock = jest.fn();
const enqueueAdConversionMock = jest.fn();
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => enqueueAdConversionMock(...args),
}));
jest.mock('./index', () => ({
  db: {
    transaction: (...args: unknown[]) => transactionMock(...args),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: async () => [{ authorId: 'author-1', clerkUserId: 'clerk-1' }],
        }),
      }),
    }),
  },
}));
jest.mock('./services/pricing', () => ({
  pricingService: { getInitialAuthorCredits: async () => 5 },
}));
jest.mock('./services/payment', () => ({ paymentService: {} }));
jest.mock('./services/fiscal-documents', () => ({ fiscalDocumentService: {} }));
jest.mock('./services/credit-packages', () => ({ creditPackagesService: {} }));
jest.mock('./services/blog', () => ({ blogService: {} }));
jest.mock('./services/faq', () => ({ faqService: {} }));
import { authorService } from './services';
import { analyticsOutbox } from './schema';
import { signUpOutboxEntry } from '@/lib/analytics/signup';

const now = new Date('2026-09-05T12:00:00Z');
const created = new Date('2026-09-05T11:00:00Z');

describe('transactional signup producers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    transactionMock.mockImplementation(async (callback) =>
      callback({
        insert: (table: unknown) => ({
          values: (values: unknown) => {
            if (table === analyticsOutbox) valuesMock(values);
            return {
              returning: async () => [{ authorId: 'author-1', clerkUserId: 'clerk-1' }],
              onConflictDoNothing: nothingMock,
            };
          },
        }),
      }),
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('a signin fallback uses Clerk account creation, never the current login time', async () => {
    jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
    await authorService.syncUserOnSignIn({ id: 'clerk-1', createdAt: created.getTime() });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: created,
        dedupeKey: signUpOutboxEntry('clerk-1', created).dedupeKey,
        authorId: 'author-1',
      }),
    );
    expect(valuesMock.mock.calls[0][0]).not.toHaveProperty('userId');
    expect(nothingMock).toHaveBeenCalledWith({ target: analyticsOutbox.dedupeKey });
    expect(enqueueAdConversionMock).toHaveBeenCalledWith(
      expect.objectContaining({ insert: expect.any(Function) }),
      expect.objectContaining({
        conversion: expect.objectContaining({
          eventType: 'registration_completed',
          eventId: 'signup_clerk-1',
        }),
        authorId: 'author-1',
        adContext: null,
        occurredAt: created,
      }),
    );
  });
  it('replays only the creation transaction after raw and wrapped deadlock errors', async () => {
    jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
    const deadlock = Object.assign(new Error('deadlock detected'), { code: '40P01' });
    transactionMock
      .mockRejectedValueOnce(new Error('Failed query', { cause: deadlock }))
      .mockRejectedValueOnce(deadlock);

    await expect(
      authorService.syncUserOnSignIn({ id: 'clerk-1', createdAt: created.getTime() }),
    ).resolves.toMatchObject({ authorId: 'author-1' });
    expect(transactionMock).toHaveBeenCalledTimes(3);
    expect(valuesMock).toHaveBeenCalledTimes(1);
    expect(enqueueAdConversionMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['40P01', 3],
    ['08006', 1],
  ])('limits transaction attempts for SQLSTATE %s', async (code, attempts) => {
    jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
    const failure = Object.assign(new Error('database error'), { code });
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      transactionMock.mockRejectedValueOnce(failure);
    }

    await expect(authorService.syncUserOnSignIn({ id: 'clerk-1' })).rejects.toBe(failure);
    expect(transactionMock).toHaveBeenCalledTimes(attempts);
    expect(valuesMock).not.toHaveBeenCalled();
    expect(enqueueAdConversionMock).not.toHaveBeenCalled();
  });

  it('reuses the author committed by a concurrent signup after a deadlock', async () => {
    jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
    transactionMock.mockRejectedValueOnce({ code: '40P01' }).mockRejectedValueOnce({
      cause: { code: '23505', constraint: 'authors_clerk_user_id_unique' },
    });

    await expect(
      authorService.syncUserOnSignIn({ id: 'clerk-1', createdAt: created.getTime() }),
    ).resolves.toMatchObject({ authorId: 'author-1' });
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(valuesMock).not.toHaveBeenCalled();
    expect(enqueueAdConversionMock).not.toHaveBeenCalled();
  });

  it('webhook-first author creation records the same date and dedupe key', async () => {
    await authorService.createAuthor({
      clerkUserId: 'clerk-1',
      email: 'example@example.com',
      displayName: 'Test',
      clerkCreatedAt: created.getTime(),
      signUpMethod: 'google',
    });
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: created,
        dedupeKey: signUpOutboxEntry('clerk-1', created).dedupeKey,
        params: { method: 'google' },
      }),
    );
    expect(valuesMock.mock.calls[0][0]).not.toHaveProperty('userId');
    const [executor, input] = enqueueAdConversionMock.mock.calls[0];
    expect(executor).toEqual(expect.objectContaining({ insert: expect.any(Function) }));
    expect(input).toMatchObject({
      conversion: { eventType: 'registration_completed', eventId: 'signup_clerk-1' },
      authorId: 'author-1',
      occurredAt: created,
    });
  });
  it.each([undefined, new Date('2025-01-01').getTime(), NaN, now.getTime() + 1])(
    'can create a local author without claiming an unverifiable current signup: %p',
    async (createdAt) => {
      jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
      await authorService.syncUserOnSignIn({ id: 'clerk-1', createdAt });
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).not.toHaveBeenCalled();
      expect(enqueueAdConversionMock).not.toHaveBeenCalled();
    },
  );
  it('login of an existing author does not enqueue a new signup', async () => {
    jest
      .spyOn(authorService, 'getAuthorByClerkId')
      .mockResolvedValue({ authorId: 'author-1' } as Awaited<
        ReturnType<typeof authorService.getAuthorByClerkId>
      >);
    await authorService.syncUserOnSignIn({
      id: 'clerk-1',
      createdAt: new Date('2025-01-01').getTime(),
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(valuesMock).not.toHaveBeenCalled();
    expect(enqueueAdConversionMock).not.toHaveBeenCalled();
  });
});

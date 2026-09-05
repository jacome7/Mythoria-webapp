/** @jest-environment node */
const valuesMock = jest.fn();
const nothingMock = jest.fn();
const transactionMock = jest.fn();
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
        dedupeKey: 'sign_up:clerk-1',
        authorId: 'author-1',
      }),
    );
    expect(nothingMock).toHaveBeenCalledWith({ target: analyticsOutbox.dedupeKey });
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
        dedupeKey: 'sign_up:clerk-1',
        params: { method: 'google' },
      }),
    );
  });
  it.each([undefined, new Date('2025-01-01').getTime(), NaN, now.getTime() + 1])(
    'can create a local author without claiming an unverifiable current signup: %p',
    async (createdAt) => {
      jest.spyOn(authorService, 'getAuthorByClerkId').mockResolvedValue(undefined);
      await authorService.syncUserOnSignIn({ id: 'clerk-1', createdAt });
      expect(transactionMock).toHaveBeenCalledTimes(1);
      expect(valuesMock).not.toHaveBeenCalled();
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
  });
});

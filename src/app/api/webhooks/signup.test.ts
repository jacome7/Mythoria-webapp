/** @jest-environment node */
const verifyMock = jest.fn();
const valuesMock = jest.fn();
const conflictMock = jest.fn();
const selectMock = jest.fn();
const createAuthorMock = jest.fn();
const enqueueAdConversionMock = jest.fn();
jest.mock('@/lib/openai-ads/outbox', () => ({
  enqueueAdConversion: (...args: unknown[]) => enqueueAdConversionMock(...args),
}));
jest.mock('svix', () => ({
  Webhook: jest.fn(() => ({ verify: (...args: unknown[]) => verifyMock(...args) })),
}));
jest.mock('next/headers', () => ({
  headers: async () =>
    new Headers({ 'svix-id': 'test', 'svix-timestamp': 'test', 'svix-signature': 'test' }),
}));
jest.mock('@/db/services', () => ({
  authorService: { createAuthor: (...args: unknown[]) => createAuthorMock(...args) },
}));
jest.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: () => ({ set: () => ({ where: jest.fn().mockResolvedValue(undefined) }) }),
    insert: () => ({
      values: (...args: unknown[]) => {
        valuesMock(...args);
        return { onConflictDoUpdate: (...options: unknown[]) => conflictMock(...options) };
      },
    }),
  },
}));
import { POST } from './route';
import { PgDialect } from 'drizzle-orm/pg-core';
import { signUpOutboxEntry } from '@/lib/analytics/signup';

const now = new Date('2026-09-05T12:00:00Z');
const created = new Date('2026-09-05T11:00:00Z');
function event(createdAt: unknown) {
  return {
    type: 'user.created',
    data: {
      id: 'clerk-1',
      created_at: createdAt,
      primary_email_address_id: 'email-1',
      email_addresses: [{ id: 'email-1', email_address: 'example@example.com' }],
      external_accounts: [{ provider: 'oauth_google' }],
    },
  };
}
function rows(value: unknown[]) {
  return { from: () => ({ where: () => ({ limit: async () => value }) }) };
}

describe('Clerk signup producer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    process.env.CLERK_WEBHOOK_SECRET = 'test-secret';
    selectMock.mockReturnValue(rows([{ authorId: 'author-1', id: 'credit-1' }]));
    createAuthorMock.mockResolvedValue({ authorId: 'author-1' });
  });
  afterEach(() => {
    jest.useRealTimers();
    delete process.env.CLERK_WEBHOOK_SECRET;
  });
  const request = (...createdAt: [unknown?]) =>
    new Request('https://mythoria.pt/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(event(createdAt.length ? createdAt[0] : created.getTime())),
    });
  it('uses the actual creation time even when the author was synchronized before the webhook', async () => {
    await POST(request());
    await POST(request());
    expect(valuesMock).toHaveBeenCalledTimes(2);
    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: signUpOutboxEntry('clerk-1', created).dedupeKey,
        occurredAt: created,
        params: { method: 'google' },
      }),
    );
    expect(valuesMock.mock.calls[0][0]).not.toHaveProperty('userId');
    const { set, setWhere } = conflictMock.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(setWhere);
    for (const column of ['delivered_at', 'claim_token', 'claimed_at'])
      expect(query.sql).toContain(`"${column}" is null`);
    expect(query.params).toContain(created.toISOString());
    expect(set).not.toHaveProperty('occurredAt');
    expect(set).not.toHaveProperty('claimToken');
    expect(enqueueAdConversionMock).toHaveBeenCalledTimes(2);
    expect(enqueueAdConversionMock).toHaveBeenCalledWith(
      expect.anything(),
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
  it('passes Clerk creation time into transactional author creation', async () => {
    selectMock.mockReturnValueOnce(rows([]));
    expect((await POST(request())).status).toBe(200);
    expect(createAuthorMock).toHaveBeenCalledWith(
      expect.objectContaining({ clerkCreatedAt: created.getTime() }),
    );
  });
  it.each([undefined, null, NaN, now.getTime() + 1, now.getTime() - 86400000])(
    'never manufactures a new event time from invalid or stale creation %p',
    async (value) => {
      expect((await POST(request(value))).status).toBe(200);
      expect(valuesMock).not.toHaveBeenCalled();
      expect(enqueueAdConversionMock).not.toHaveBeenCalled();
    },
  );
});

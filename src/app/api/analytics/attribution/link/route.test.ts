const getCurrentAuthorMock = jest.fn();
const selectWhereMock = jest.fn();
const updateWhereMock = jest.fn();
const updateSetMock = jest.fn();
const insertValuesMock = jest.fn();
const transactionMock = jest.fn();
const currentUserMock = jest.fn();
const conflictMock = jest.fn();
const signUpReturningMock = jest.fn();
const pendingSignUpMock = jest.fn();
const now = new Date('2026-09-05T12:00:00Z');
const creation = new Date('2026-09-05T11:00:00Z');

jest.mock('@clerk/nextjs/server', () => ({ currentUser: () => currentUserMock() }));

jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => getCurrentAuthorMock() }));
jest.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (...args: unknown[]) => selectWhereMock(...args),
      }),
    }),
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { NextRequest } from 'next/server';
import { POST } from './route';
import { PgDialect } from 'drizzle-orm/pg-core';

describe('POST /api/analytics/attribution/link', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signUpReturningMock.mockResolvedValue([{ outboxId: 'outbox-1' }]);
    pendingSignUpMock.mockResolvedValue([]);
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] })
      .setSystemTime(now);
    currentUserMock.mockResolvedValue({ id: 'clerk-1', createdAt: creation.getTime() });
    getCurrentAuthorMock.mockResolvedValue({
      authorId: 'author-1',
      clerkUserId: 'clerk-1',
    });
    selectWhereMock.mockResolvedValue([
      {
        attributionId: '11111111-1111-4111-8111-111111111111',
        createdAt: new Date('2026-09-05T10:59:00Z'),
        expiresAt: new Date('2026-09-06T10:59:00Z'),
        clientId: '123.456',
        sessionId: 1712345678,
        consent: {
          analyticsStorage: 'granted',
          adUserData: 'denied',
          adPersonalization: 'denied',
        },
        landingSlug: 'homepage',
        primaryIntent: 'romance',
      },
    ]);
    transactionMock.mockImplementation(async (callback) =>
      callback({
        select: () => ({ from: () => ({ where: () => ({ limit: pendingSignUpMock }) }) }),
        insert: () => ({
          values: (...args: unknown[]) => {
            insertValuesMock(...args);
            return {
              onConflictDoUpdate: (...args: unknown[]) => {
                conflictMock(...args);
                return { returning: signUpReturningMock };
              },
            };
          },
        }),
        update: () => ({
          set: (...args: unknown[]) => {
            updateSetMock(...args);
            return {
              where: (...args: unknown[]) => {
                updateWhereMock(...args);
                return {
                  returning: jest.fn().mockResolvedValue([]),
                };
              },
            };
          },
        }),
      }),
    );
    updateWhereMock.mockResolvedValue(undefined);
  });

  afterEach(() => jest.useRealTimers());

  it('links the current author without deleting the 24-hour attribution cookie', async () => {
    const request = new NextRequest('https://mythoria.pt/api/analytics/attribution/link', {
      method: 'POST',
      headers: {
        cookie: 'mythoria_attribution=11111111-1111-4111-8111-111111111111',
      },
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ linked: true });
    expect(updateWhereMock).toHaveBeenCalledTimes(3);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: creation,
        authorId: 'author-1',
        clientId: '123.456',
        params: expect.objectContaining({
          landing_slug: 'homepage',
          primary_intent: 'romance',
        }),
      }),
    );
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  const request = () =>
    new NextRequest('https://mythoria.pt/api/analytics/attribution/link', {
      method: 'POST',
      headers: { cookie: 'mythoria_attribution=11111111-1111-4111-8111-111111111111' },
    });

  it.each([
    undefined,
    NaN,
    now.getTime() + 1,
    now.getTime() - 24 * 60 * 60 * 1000,
    new Date('2025-01-01').getTime(),
  ])(
    'links acquisition but never creates a signup for invalid/old creation %p',
    async (createdAt) => {
      currentUserMock.mockResolvedValue({ id: 'clerk-1', createdAt });
      expect((await POST(request())).status).toBe(200);
      expect(insertValuesMock).not.toHaveBeenCalled();
      // General enrichment cannot bypass the stricter sign_up recovery path.
      const query = new PgDialect().sqlToQuery(updateWhereMock.mock.calls[1][0]);
      expect(query.sql).toContain('"event_name" <>');
      expect(query.params).toContain('sign_up');
    },
  );

  it('does not trust a mismatched Clerk identity', async () => {
    currentUserMock.mockResolvedValue({ id: 'different-user', createdAt: creation.getTime() });
    await POST(request());
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('keeps database guards atomic when a webhook, repeated link or delivery races the upsert', async () => {
    await POST(request());
    await POST(request());
    expect(
      insertValuesMock.mock.calls.every(
        ([entry]) =>
          entry.dedupeKey === 'sign_up:clerk-1' &&
          entry.occurredAt.getTime() === creation.getTime(),
      ),
    ).toBe(true);
    const { setWhere, set } = conflictMock.mock.calls[0][0];
    const query = new PgDialect().sqlToQuery(setWhere);
    for (const column of ['delivered_at', 'claim_token', 'claimed_at'])
      expect(query.sql).toContain(`"${column}" is null`);
    for (const column of ['occurred_at', 'attribution_id', 'client_id', 'session_id'])
      expect(query.sql).toContain(`"${column}" =`);
    expect(query.params).toContain(creation.toISOString());
    expect(query.params).toContain('Analytics storage was not granted');
    expect(set).not.toHaveProperty('occurredAt');
    expect(set).not.toHaveProperty('deliveredAt');
    expect(set).not.toHaveProperty('claimToken');
    expect(set).not.toHaveProperty('claimedAt');
    expect(set.skippedAt).toBeNull();
    const genericQuery = new PgDialect().sqlToQuery(updateWhereMock.mock.calls[1][0]);
    expect(genericQuery.sql).toContain('"claimed_at" is null');
    expect(genericQuery.sql).toContain('"claim_token" is null');
  });

  it('recovers consent in the creation session while keeping the original signup timestamp', async () => {
    const [attribution] = await selectWhereMock();
    const consentAt = new Date('2026-09-05T11:02:00Z');
    selectWhereMock.mockResolvedValue([
      {
        ...attribution,
        createdAt: consentAt,
        latestAttributionAt: consentAt,
        sessionId: new Date('2026-09-05T10:59:00Z').getTime() / 1000,
      },
    ]);
    await POST(request());
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        occurredAt: creation,
        consent: expect.objectContaining({ analyticsStorage: 'granted' }),
      }),
    );
    expect(conflictMock.mock.calls[0][0].set).not.toHaveProperty('occurredAt');
  });

  it('preserves account linking without associating a later campaign to the signup', async () => {
    const [attribution] = await selectWhereMock();
    selectWhereMock.mockResolvedValue([
      { ...attribution, latestAttributionAt: new Date('2026-09-05T11:02:00Z') },
    ]);
    expect((await POST(request())).status).toBe(200);
    expect(updateSetMock).toHaveBeenCalledWith(expect.objectContaining({ authorId: 'author-1' }));
    expect(insertValuesMock).not.toHaveBeenCalled();
  });

  it('reports a claimed signup as pending, then completes recovery after the worker releases it', async () => {
    signUpReturningMock.mockResolvedValueOnce([]);
    pendingSignUpMock.mockResolvedValueOnce([{ outboxId: 'outbox-1' }]);
    const first = await POST(request());
    await expect(first.json()).resolves.toEqual({ linked: true, signUpPending: true });
    const second = await POST(request());
    await expect(second.json()).resolves.toEqual({ linked: true });
    expect(pendingSignUpMock).toHaveBeenCalledTimes(1);
    expect(conflictMock.mock.calls[1][0].set.skippedAt).toBeNull();
    expect(conflictMock.mock.calls[1][0].set).not.toHaveProperty('claimToken');
    expect(insertValuesMock.mock.calls[1][0].occurredAt).toEqual(creation);
  });

  it('does not request retries for a delivered or otherwise ineligible existing signup', async () => {
    signUpReturningMock.mockResolvedValueOnce([]);
    pendingSignUpMock.mockResolvedValueOnce([]);
    await expect((await POST(request())).json()).resolves.toEqual({ linked: true });
  });
});

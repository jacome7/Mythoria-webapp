/** @jest-environment node */

const selectMock = jest.fn();
const updateMock = jest.fn();
const insertMock = jest.fn();
const transactionMock = jest.fn();
const executeMock = jest.fn();
const sendOpenAiEventsMock = jest.fn();
const isConfiguredMock = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: (...args: unknown[]) => selectMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    insert: (...args: unknown[]) => insertMock(...args),
    transaction: (...args: unknown[]) => transactionMock(...args),
    execute: (...args: unknown[]) => executeMock(...args),
  },
}));

jest.mock('./capi', () => ({
  isOpenAiCapiConfigured: () => isConfiguredMock(),
  sendOpenAiEvents: (...args: unknown[]) => sendOpenAiEventsMock(...args),
}));

import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { db } from '@/db';
import { conversions, type OpenAiConversion } from './events';
import { sha256HexNode } from './hashing.server';
import {
  deliverAdConversions,
  enqueueAdConversion,
  fanOutAdConversions,
  scrubPaymentOrderAdContext,
} from './outbox';
import type { OpenAiCapiEvent } from './capi';
import type { AdContext } from './types';

const dbMock = db;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** A chainable, awaitable query builder that resolves to `rows`. */
function query(rows: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'orderBy', 'limit', 'leftJoin', 'innerJoin']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject);
  return chain;
}

function queueSelects(...results: unknown[][]) {
  for (const rows of results) selectMock.mockImplementationOnce(() => query(rows));
}

/** Records every `update().set()` payload; claim updates (`.returning()`) echo the queued rows. */
function mockUpdates(claimRows: unknown[]) {
  const sets: Array<Record<string, unknown>> = [];
  const pendingClaims = [...claimRows];
  updateMock.mockImplementation(() => ({
    set: jest.fn((values: Record<string, unknown>) => {
      sets.push(values);
      const result = {
        returning: jest.fn(() => {
          const next = pendingClaims.shift();
          return Promise.resolve(next ? [{ ...next, ...values }] : []);
        }),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(undefined).then(resolve),
      };
      return { where: jest.fn(() => result) };
    }),
  }));
  return sets;
}

function mockInsert(returning: unknown[] | Error = [{ outboxId: 'new-row' }]) {
  const values: Array<Record<string, unknown>> = [];
  insertMock.mockImplementation(() => ({
    values: jest.fn((row: Record<string, unknown>) => {
      values.push(row);
      return {
        onConflictDoNothing: jest.fn(() => ({
          returning: jest.fn(() =>
            returning instanceof Error ? Promise.reject(returning) : Promise.resolve(returning),
          ),
        })),
      };
    }),
  }));
  return values;
}

const grantedContext: AdContext = {
  adConsent: 'granted',
  oppref: 'oppref-123',
  obref: 'obref-456',
  ipAddress: '203.0.113.7',
  userAgent: 'Mozilla/5.0 Test',
  sourceUrl: 'https://mythoria.pt/en-US/tell-your-story/step-5',
  capturedAt: '2026-11-16T10:00:00.000Z',
};

const author = {
  email: ' Reader@Example.com ',
  mobilePhone: '+351 912 345 678',
  displayName: "Ana O'Connor",
  countryOfOrigin: 'pt',
  clerkUserId: 'user_abc',
  accountClosedAt: null,
};

function outboxRow(overrides: Record<string, unknown> = {}) {
  const lead = conversions.storyLead('run-1');
  return {
    outboxId: 'ad-1',
    destination: 'openai',
    eventId: lead.eventId,
    eventType: lead.eventType,
    customEventName: null,
    dedupeName: 'lead_created',
    sourceOutboxId: null,
    authorId: 'author-1',
    data: lead.data,
    adContext: grantedContext,
    occurredAt: new Date(Date.now() - 10 * MINUTE),
    availableAt: new Date(Date.now() - MINUTE),
    attempts: 0,
    claimToken: null,
    claimedAt: null,
    deliveredAt: null,
    skippedAt: null,
    lastError: null,
    createdAt: new Date(Date.now() - 10 * MINUTE),
    ...overrides,
  };
}

function sentEvents(call = 0): OpenAiCapiEvent[] {
  return sendOpenAiEventsMock.mock.calls[call][0] as OpenAiCapiEvent[];
}

describe('enqueueAdConversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation((callback: (tx: unknown) => unknown) => callback(dbMock));
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('rejects an invalid conversion without touching the database', async () => {
    const invalid = {
      eventType: 'custom',
      eventId: 'x_1',
      data: { type: 'custom', amount: 100 },
    } as unknown as OpenAiConversion;

    await expect(enqueueAdConversion(dbMock, { conversion: invalid })).resolves.toBe(false);
    await expect(enqueueAdConversion(dbMock, { conversion: undefined as never })).resolves.toBe(
      false,
    );
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts the conversion with its dedupe name inside a savepoint', async () => {
    const values = mockInsert();
    const occurredAt = new Date('2026-11-16T09:00:00Z');

    await expect(
      enqueueAdConversion(dbMock, {
        conversion: conversions.storyGenerated('run-1'),
        authorId: 'author-1',
        adContext: grantedContext,
        occurredAt,
        sourceOutboxId: 'src-1',
      }),
    ).resolves.toBe(true);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(values[0]).toMatchObject({
      destination: 'openai',
      eventId: 'story_generated_run-1',
      eventType: 'custom',
      customEventName: 'story_generated',
      dedupeName: 'story_generated',
      authorId: 'author-1',
      sourceOutboxId: 'src-1',
      occurredAt,
      adContext: grantedContext,
    });
  });

  it('strips identifiers from a denied context before storing it', async () => {
    const values = mockInsert();

    await enqueueAdConversion(dbMock, {
      conversion: conversions.registrationCompleted('user_abc'),
      adContext: { ...grantedContext, adConsent: 'denied' },
    });

    expect(values[0]).toMatchObject({ dedupeName: 'registration_completed' });
    expect(values[0].adContext).toEqual({
      adConsent: 'denied',
      sourceUrl: grantedContext.sourceUrl,
      capturedAt: grantedContext.capturedAt,
    });
  });

  it('returns false on a duplicate and never throws on database errors', async () => {
    mockInsert([]);
    await expect(
      enqueueAdConversion(dbMock, { conversion: conversions.storyLead('run-1') }),
    ).resolves.toBe(false);

    mockInsert(new Error('connection lost'));
    await expect(
      enqueueAdConversion(dbMock, { conversion: conversions.storyLead('run-1') }),
    ).resolves.toBe(false);
  });

  it('never logs the query parameters of a failed insert', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockInsert(
      new Error('Failed query: insert into "ad_conversion_outbox"\nparams: 203.0.113.7', {
        cause: new Error('relation "ad_conversion_outbox" does not exist'),
      }),
    );
    await enqueueAdConversion(dbMock, {
      conversion: conversions.storyLead('run-1'),
      adContext: grantedContext,
    });
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain('does not exist');
    expect(logged).not.toContain('203.0.113.7');

    mockInsert(new Error('Failed query: insert\nparams: 203.0.113.7'));
    await enqueueAdConversion(dbMock, {
      conversion: conversions.storyLead('run-1'),
      adContext: grantedContext,
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('203.0.113.7');
  });
});

describe('fanOutAdConversions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    transactionMock.mockImplementation((callback: (tx: unknown) => unknown) => callback(dbMock));
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('builds story_generated from completed runs and copies the lead context', async () => {
    const occurredAt = new Date(Date.now() - HOUR);
    queueSelects(
      [
        {
          outboxId: 'src-1',
          dedupeKey: 'story_generation_completed:run-1',
          authorId: 'author-1',
          occurredAt,
        },
        {
          outboxId: 'src-2',
          dedupeKey: 'story_generation_completed:run-2',
          authorId: 'author-2',
          occurredAt,
        },
      ],
      [{ eventId: 'story_run-1', adContext: grantedContext }],
    );
    const values = mockInsert();

    await expect(fanOutAdConversions()).resolves.toEqual({ created: 2 });

    expect(values[0]).toMatchObject({
      eventId: 'story_generated_run-1',
      customEventName: 'story_generated',
      dedupeName: 'story_generated',
      authorId: 'author-1',
      sourceOutboxId: 'src-1',
      occurredAt,
      adContext: grantedContext,
      data: conversions.storyGenerated('run-1').data,
    });
    expect(values[1]).toMatchObject({
      eventId: 'story_generated_run-2',
      sourceOutboxId: 'src-2',
      adContext: null,
    });
  });

  it('does nothing when there are no unfanned completions', async () => {
    queueSelects([]);
    const values = mockInsert();

    await expect(fanOutAdConversions()).resolves.toEqual({ created: 0 });
    expect(values).toHaveLength(0);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});

describe('deliverAdConversions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isConfiguredMock.mockReturnValue(true);
    sendOpenAiEventsMock.mockResolvedValue({ ok: true });
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends nothing and only expires stale rows when the Conversions API is not configured', async () => {
    isConfiguredMock.mockReturnValue(false);
    const sets = mockUpdates([outboxRow({ occurredAt: new Date(Date.now() - 8 * DAY) })]);

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 1,
      deferred: 0,
    });
    expect(selectMock).not.toHaveBeenCalled();
    expect(sendOpenAiEventsMock).not.toHaveBeenCalled();
    expect(sets).toEqual([
      { skippedAt: expect.any(Date), lastError: 'expired_7d', adContext: null },
    ]);
  });

  it('sends hashed user data, oppref and obref with consent and clears the context', async () => {
    const row = outboxRow();
    queueSelects([row], [author]);
    const sets = mockUpdates([row]);

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 1,
      failed: 0,
      skipped: 0,
      deferred: 0,
    });

    const [event] = sentEvents();
    expect(event).toEqual({
      id: 'story_run-1',
      type: 'lead_created',
      timestamp_ms: row.occurredAt.getTime(),
      action_source: 'web',
      source_url: grantedContext.sourceUrl,
      oppref: 'oppref-123',
      user: {
        emails_sha256: [sha256HexNode('reader@example.com')],
        phone_numbers_sha256: [sha256HexNode('351912345678')],
        first_names_sha256: [sha256HexNode('ana')],
        last_names_sha256: [sha256HexNode('oconnor')],
        external_ids_sha256: [sha256HexNode('user_abc')],
        countries: ['PT'],
        obref: 'obref-456',
        ip_address: '203.0.113.7',
        user_agent: 'Mozilla/5.0 Test',
      },
      data: { type: 'customer_action' },
    });
    const delivered = sets.find((values) => values.deliveredAt);
    expect(delivered).toMatchObject({
      attempts: 1,
      claimToken: null,
      claimedAt: null,
      lastError: null,
      adContext: null,
    });
  });

  it('sends no user data or oppref without advertising consent', async () => {
    const row = outboxRow({ adContext: { ...grantedContext, adConsent: 'denied' } });
    queueSelects([row]);
    mockUpdates([row]);

    await expect(deliverAdConversions()).resolves.toMatchObject({ delivered: 1 });

    const [event] = sentEvents();
    expect(event).not.toHaveProperty('user');
    expect(event).not.toHaveProperty('oppref');
    expect(event.opt_out).toBe(true);
    expect(event.source_url).toBe(grantedContext.sourceUrl);
    // Only the pending-row query ran: the author was never loaded.
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it('isolates the bad event when a batch is rejected with HTTP 400', async () => {
    const good = outboxRow({
      outboxId: 'ad-good',
      adContext: { ...grantedContext, adConsent: 'denied' },
    });
    const bad = outboxRow({
      outboxId: 'ad-bad',
      eventId: 'story_run-2',
      adContext: { ...grantedContext, adConsent: 'denied' },
    });
    queueSelects([good, bad]);
    const sets = mockUpdates([good, bad]);
    sendOpenAiEventsMock
      .mockResolvedValueOnce({ ok: false, status: 400, retryable: false, error: 'HTTP 400 bad' })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 400, retryable: false, error: 'HTTP 400 bad' });

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 1,
      failed: 1,
      skipped: 0,
      deferred: 0,
    });

    expect(sendOpenAiEventsMock).toHaveBeenCalledTimes(3);
    expect(sentEvents(0)).toHaveLength(2);
    expect(sentEvents(1).map((event) => event.id)).toEqual(['story_run-1']);
    expect(sentEvents(2).map((event) => event.id)).toEqual(['story_run-2']);
    const outcomes = sets.filter((values) => !('claimToken' in values && values.claimToken));
    expect(outcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ deliveredAt: expect.any(Date), adContext: null }),
        expect.objectContaining({
          attempts: 1,
          skippedAt: expect.any(Date),
          lastError: 'HTTP 400 bad',
        }),
      ]),
    );
  });

  it('backs off on retryable failures and gives up after the last attempt', async () => {
    const fresh = outboxRow({ adContext: { ...grantedContext, adConsent: 'denied' } });
    const exhausted = outboxRow({
      outboxId: 'ad-2',
      eventId: 'story_run-2',
      attempts: 7,
      adContext: { ...grantedContext, adConsent: 'denied' },
    });
    queueSelects([fresh, exhausted]);
    const sets = mockUpdates([fresh, exhausted]);
    sendOpenAiEventsMock.mockResolvedValue({
      ok: false,
      status: 503,
      retryable: true,
      error: 'HTTP 503',
    });
    const before = Date.now();

    await expect(deliverAdConversions()).resolves.toMatchObject({ delivered: 0, failed: 2 });

    expect(sendOpenAiEventsMock).toHaveBeenCalledTimes(1);
    const failures = sets.filter((values) => values.lastError === 'HTTP 503');
    expect(failures).toHaveLength(2);
    expect(failures[0]).toMatchObject({ attempts: 1, claimToken: null });
    expect(failures[0]).not.toHaveProperty('skippedAt');
    const retryDelay = (failures[0].availableAt as Date).getTime() - before;
    expect(retryDelay).toBeGreaterThanOrEqual(2 * MINUTE - 1000);
    expect(retryDelay).toBeLessThanOrEqual(2 * MINUTE + 5000);
    expect(failures[1]).toMatchObject({
      attempts: 8,
      skippedAt: expect.any(Date),
      adContext: null,
    });
  });

  it('skips events older than the 7-day Conversions API window', async () => {
    const row = outboxRow({ occurredAt: new Date(Date.now() - 7 * DAY) });
    queueSelects([row]);
    const sets = mockUpdates([row]);

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 1,
      deferred: 0,
    });
    expect(sendOpenAiEventsMock).not.toHaveBeenCalled();
    expect(sets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ skippedAt: expect.any(Date), lastError: 'expired_7d' }),
      ]),
    );
  });

  it('defers a recent event without context until an attribution can be found', async () => {
    const row = outboxRow({ adContext: null, occurredAt: new Date(Date.now() - 10 * MINUTE) });
    queueSelects([row], []);
    const sets = mockUpdates([row]);
    const before = Date.now();

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 0,
      deferred: 1,
    });

    expect(sendOpenAiEventsMock).not.toHaveBeenCalled();
    const deferral = sets.find((values) => values.lastError === 'awaiting_ad_context');
    expect(deferral).toMatchObject({ claimToken: null, claimedAt: null });
    expect(deferral).not.toHaveProperty('attempts');
    expect((deferral!.availableAt as Date).getTime() - before).toBeGreaterThanOrEqual(
      15 * MINUTE - 1000,
    );
  });

  it('sends without identifiers once the context grace period has passed', async () => {
    const row = outboxRow({ adContext: null, occurredAt: new Date(Date.now() - 3 * HOUR) });
    queueSelects([row], []);
    mockUpdates([row]);

    await expect(deliverAdConversions()).resolves.toMatchObject({ delivered: 1, deferred: 0 });

    const [event] = sentEvents();
    expect(event.source_url).toBe('https://mythoria.pt');
    expect(event).not.toHaveProperty('user');
    expect(event).not.toHaveProperty('oppref');
    expect(event.opt_out).toBe(true);
  });

  it('enriches a context-less event from the author attribution', async () => {
    const occurredAt = new Date(Date.now() - 10 * MINUTE);
    const row = outboxRow({ adContext: null, occurredAt });
    const attribution = {
      consent: { analyticsStorage: 'granted', adUserData: 'granted', adPersonalization: 'denied' },
      latestPath: '/en-US/stories/0f8fad5b-d9cb-469f-a165-70867728950e',
      oppref: 'oppref-attr',
      opprefCapturedAt: new Date(occurredAt.getTime() - 2 * DAY),
      obref: 'obref-attr',
    };
    queueSelects([row], [attribution], [author]);
    mockUpdates([row]);

    await expect(deliverAdConversions()).resolves.toMatchObject({ delivered: 1 });

    const [event] = sentEvents();
    expect(event.source_url).toBe('https://mythoria.pt/en-US/stories/:id');
    expect(event.oppref).toBe('oppref-attr');
    expect(event.user).toMatchObject({
      obref: 'obref-attr',
      external_ids_sha256: [sha256HexNode('user_abc')],
    });
    expect(event.user).not.toHaveProperty('ip_address');
  });

  it('does not use an oppref captured more than 30 days before the event', async () => {
    const occurredAt = new Date(Date.now() - 10 * MINUTE);
    const row = outboxRow({ adContext: null, occurredAt });
    queueSelects(
      [row],
      [
        {
          consent: {
            analyticsStorage: 'granted',
            adUserData: 'granted',
            adPersonalization: 'granted',
          },
          latestPath: null,
          oppref: 'stale',
          opprefCapturedAt: new Date(occurredAt.getTime() - 31 * DAY),
          obref: null,
        },
      ],
      [author],
    );
    mockUpdates([row]);

    await deliverAdConversions();

    const [event] = sentEvents();
    expect(event).not.toHaveProperty('oppref');
    expect(event.source_url).toBe('https://mythoria.pt');
    expect(event.user?.emails_sha256).toEqual([sha256HexNode('reader@example.com')]);
  });

  it('releases unsent claims without consuming attempts when isolation runs out of time', async () => {
    const rows = ['ad-1', 'ad-2', 'ad-3'].map((outboxId, index) =>
      outboxRow({
        outboxId,
        eventId: `story_run-${index + 1}`,
        adContext: { ...grantedContext, adConsent: 'denied' },
      }),
    );
    queueSelects(rows);
    const sets = mockUpdates(rows);
    const realNow = Date.now();
    let clock = realNow;
    jest.spyOn(Date, 'now').mockImplementation(() => clock);
    sendOpenAiEventsMock
      .mockResolvedValueOnce({ ok: false, status: 400, retryable: false, error: 'HTTP 400 bad' })
      .mockImplementationOnce(async () => {
        // The first isolated request is slow: the 2-minute isolation budget is now spent.
        clock = realNow + 3 * MINUTE;
        return { ok: true };
      });

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 1,
      failed: 0,
      skipped: 0,
      deferred: 2,
    });

    expect(sendOpenAiEventsMock).toHaveBeenCalledTimes(2);
    expect(sentEvents(1).map((event) => event.id)).toEqual(['story_run-1']);
    const released = sets.filter(
      (values) => 'claimToken' in values && values.claimToken === null && !values.deliveredAt,
    );
    expect(released).toEqual([
      { claimToken: null, claimedAt: null },
      { claimToken: null, claimedAt: null },
    ]);
  });

  it('does not deliver a row claimed by another worker', async () => {
    queueSelects([outboxRow()]);
    mockUpdates([]);

    await expect(deliverAdConversions()).resolves.toEqual({
      delivered: 0,
      failed: 0,
      skipped: 0,
      deferred: 0,
    });
    expect(sendOpenAiEventsMock).not.toHaveBeenCalled();
  });
});

describe('scrubPaymentOrderAdContext', () => {
  const dialect = new PgDialect();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('removes only the ads key from terminal or week-old orders in a bounded batch', async () => {
    executeMock.mockResolvedValue({ rowCount: 3 });

    await expect(scrubPaymentOrderAdContext()).resolves.toEqual({ scrubbed: 3 });

    expect(executeMock).toHaveBeenCalledTimes(1);
    const query = dialect.sqlToQuery(executeMock.mock.calls[0][0] as SQL);
    const text = query.sql.replace(/\s+/g, ' ');
    expect(text).toContain("SET metadata = metadata - 'ads'");
    expect(text).toContain("jsonb_typeof(metadata) = 'object' AND metadata ? 'ads'");
    expect(text).toContain(
      "status IN ('completed', 'cancelled', 'expired') OR created_at < now() - interval '7 days'",
    );
    // `failed` orders can still be paid in the same Checkout Session: never scrubbed early.
    expect(text).not.toContain("'failed'");
    expect(text).toContain('LIMIT $1 FOR UPDATE SKIP LOCKED');
    expect(query.params).toEqual([500]);
    expect(text).not.toContain('updated_at');
  });

  it('reports zero when nothing needs scrubbing', async () => {
    executeMock.mockResolvedValue({ rowCount: 0 });
    await expect(scrubPaymentOrderAdContext()).resolves.toEqual({ scrubbed: 0 });
    expect(console.info).not.toHaveBeenCalled();
  });
});

/** @jest-environment node */
import { NextRequest } from 'next/server';
import { PgDialect } from 'drizzle-orm/pg-core';
import { analyticsReference } from '@/lib/analytics/reference';
import { premiumBookType } from '@/lib/premium-children-book/contract';
import { POST } from './route';

const mockWhere = jest.fn();
const mockTransaction = jest.fn();
const mockGetCurrentAuthor = jest.fn();
const mockRequestAnalyticsReceipt = jest.fn();
const mockActiveReceipt = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({ leftJoin: () => ({ where: mockWhere }) }),
        where: mockWhere,
      }),
    }),
    transaction: (callback: (...args: unknown[]) => unknown) => mockTransaction(callback),
  },
}));
jest.mock('@/lib/auth', () => ({ getCurrentAuthor: () => mockGetCurrentAuthor() }));
jest.mock('@/lib/growth/measurement-server', () => ({
  requestAnalyticsReceipt: () => mockRequestAnalyticsReceipt(),
  activeReceipt: () => mockActiveReceipt(),
  growthOutboxContext: () => ({}),
}));

const shareToken = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-8000-000000000002';
const receiptId = '00000000-0000-4000-8000-000000000003';
const readerId = '00000000-0000-4000-8000-000000000004';
const publishedPremium = {
  id: storyId,
  owner: 'owner',
  status: 'published',
  features: {
    premiumBook: {
      type: premiumBookType,
      version: 1,
      state: 'published',
      revision: '00000000-0000-4000-8000-000000000005',
      manifest: { key: 'manifest.json', generation: '1', sha256: 'a'.repeat(64), bytes: 1 },
    },
  },
  collaboratorId: null,
};

function open(scope: 'public' | 'private_view' | 'private_edit' = 'private_view', token?: string) {
  return POST(
    new NextRequest('https://mythoria.pt/api/analytics/qualified-share', {
      method: 'POST',
      headers: {
        'user-agent': 'Mozilla/5.0',
        cookie: `mythoria_reader_link=${token ?? shareToken}`,
      },
      body: JSON.stringify({
        ...(scope === 'public' ? { slug: 'premium-book' } : { storyId }),
        campaign: {
          utm_source: 'copy_link',
          utm_medium: 'referral',
          utm_campaign: 'story_share',
          utm_id: analyticsReference(storyId),
          utm_content: scope,
        },
      }),
    }),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestAnalyticsReceipt.mockReturnValue(receiptId);
  mockActiveReceipt.mockResolvedValue({ authorId: readerId });
  mockGetCurrentAuthor.mockResolvedValue({ authorId: readerId });
  mockWhere.mockReset().mockResolvedValue([publishedPremium]);
  mockTransaction.mockImplementation((callback) =>
    callback({
      execute: jest.fn(),
      insert: () => ({
        values: (values: unknown) => {
          mockInsert(values);
          return {
            onConflictDoNothing: () => ({
              returning: async () => [{ openId: 'open', openedAt: new Date() }],
            }),
          };
        },
      }),
    }),
  );
});

it('records a linked premium view without adding a collaborator', async () => {
  expect((await open()).status).toBe(204);
  const query = new PgDialect().sqlToQuery(mockWhere.mock.calls[0][0]);
  expect(query.params).toEqual([shareToken, storyId, false, expect.any(String), 'view']);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ storyId, receiptId, authorId: readerId, scope: 'private_view' }),
  );
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ eventName: 'story_share_qualified_open' }),
  );
});

it('retains the existing public-share measurement with a public slug', async () => {
  mockGetCurrentAuthor.mockResolvedValueOnce(null);
  mockActiveReceipt.mockResolvedValueOnce({ authorId: null });
  expect((await open('public')).status).toBe(204);
  expect(mockInsert).toHaveBeenCalledWith(
    expect.objectContaining({ storyId, receiptId, scope: 'public' }),
  );
});

it.each([
  ['no active link', undefined, 'private_view'],
  ['standard story without a collaborator', { ...publishedPremium, features: {} }, 'private_view'],
  ['unpublished premium story', { ...publishedPremium, status: 'writing' }, 'private_view'],
  ['premium link with edit scope', publishedPremium, 'private_edit'],
] as const)('does not record %s', async (_name, story, scope) => {
  mockWhere.mockResolvedValueOnce(story ? [story] : []);
  expect((await open(scope)).status).toBe(204);
  expect(mockTransaction).not.toHaveBeenCalled();
});

it('requires current consent and a scoped link cookie', async () => {
  mockRequestAnalyticsReceipt.mockReturnValueOnce(undefined);
  expect((await open()).status).toBe(204);
  expect((await open('private_view', 'invalid')).status).toBe(204);
  expect(mockWhere).not.toHaveBeenCalled();
});

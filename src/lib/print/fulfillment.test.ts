/** @jest-environment node */

const mockSubmit = jest.fn();
const mockQuote = jest.fn();
const mockWrite = jest.fn();
const mockFind = jest.fn();
let mockCeiling = '20';

function mockWriter() {
  return {
    set: (values: object) => {
      mockWrite(values);
      return {
        where: () => ({
          returning: async () => [{ ...fulfillment, ...values }],
        }),
      };
    },
  };
}

jest.mock('@/db', () => ({
  db: {
    update: () => mockWriter(),
    transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        update: () => mockWriter(),
        select: () => ({
          from: () => ({ where: () => ({ for: async () => [{ max: mockCeiling }] }) }),
        }),
      }),
  },
}));
jest.mock('@/lib/lulu/client', () => ({
  submitLuluJob: (...args: unknown[]) => mockSubmit(...args),
  LuluHttpError: class extends Error {
    constructor(public status: number) {
      super('Supplier rejected request');
    }
  },
  quoteLuluOrder: (...args: unknown[]) => mockQuote(...args),
  findLuluJob: (...args: unknown[]) => mockFind(...args),
}));
jest.mock('./proof', () => ({
  signedProofLink: jest.fn(async () => 'https://storage.test/signed'),
}));

import { LuluHttpError } from '@/lib/lulu/client';
import { reconcilePrintOrder, submitPrintOrder } from './fulfillment';

const id = '32c3cb83-00c2-4933-972b-916ec8065f18';
const confirmationId = 'b53517fe-a406-493b-bda7-9cad123bd371';
const proofFile = { bucket: 'b', object: 'o', generation: '1', sha256: 'a'.repeat(64), size: 55 };
const proof = {
  interior: proofFile,
  cover: proofFile,
  pageCount: 48,
  qaPassed: true,
  qaCriticalCount: 0,
};
const shippingSnapshot = {
  name: 'Receiver',
  street1: 'Example 1',
  city: 'Lisbon',
  postcode: '1000-001',
  country_code: 'PT',
  phone_number: '123456789',
  email: 'receiver@example.test',
};
const emailVariables = {
  email: 'owner@example.test',
  name: 'Owner',
  OrderNumber: id,
  OrderDate: '2026-11-21',
  CreditCost: 10,
  numberOfCopies: 2,
  storyTitle: 'Title',
  CoverImageURL: '',
  line1: '',
  line2: '',
  city: '',
  stateRegion: '',
  postalCode: '',
  country: '',
  phone: '',
  listenURL: '',
  contactURL: '',
  language: 'en-US',
};
const fulfillment = {
  status: 'proof_ready',
  provider: 'lulu',
  binding: 'paperback',
  proofSentAt: new Date(),
  proofVersion: 1,
  proof,
  copies: 2,
  runId: id,
  holdReason: null,
  updatedAt: new Date(),
  vendor: null,
  quote: {
    confirmationId,
    podPackageId: 'sku',
    shippingLevel: 'EXPRESS',
    totalEur: 30,
    perCopyEur: 15,
  },
  shippingSnapshot,
  emailVariables,
};

function order(overrides: Partial<typeof fulfillment> = {}) {
  return {
    fulfillment: { ...fulfillment, ...overrides },
    request: { id, storyId: id },
  } as unknown as Parameters<typeof submitPrintOrder>[0];
}

describe('Lulu release safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCeiling = '20';
    mockQuote.mockResolvedValue({ shippingLevel: 'EXPRESS', totalEur: 30 });
  });

  it('requires the current sent, clear, QA-passed proof and exact price', async () => {
    const actor = 'operator@example.test';
    const approval = { confirmationId, confirmedTotalEur: 30 };
    const candidates = [
      order({ proofSentAt: null as unknown as Date }),
      order({ holdReason: 'review guest address' as unknown as null }),
      order({ proof: { ...proof, qaPassed: false } }),
    ];
    for (const candidate of candidates) {
      await expect(submitPrintOrder(candidate, approval, actor)).rejects.toMatchObject({
        code: 'print_not_approved',
      });
    }
    await expect(
      submitPrintOrder(order(), { ...approval, confirmedTotalEur: 29 }, actor),
    ).rejects.toMatchObject({ code: 'print_not_approved' });
    expect(mockQuote).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('refreshes a changed cost without creating a supplier job', async () => {
    mockQuote.mockResolvedValue({ shippingLevel: 'EXPRESS', totalEur: 32 });
    const result = await submitPrintOrder(
      order(),
      { confirmationId, confirmedTotalEur: 30 },
      'operator@example.test',
    );
    expect(result.fulfillment.quote).toMatchObject({ totalEur: 32, perCopyEur: 16 });
    expect(result.fulfillment.quote).not.toMatchObject({ confirmationId });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('applies the EUR ceiling to landed total divided by copies', async () => {
    mockCeiling = '14.99';
    await expect(
      submitPrintOrder(order(), { confirmationId, confirmedTotalEur: 30 }, 'operator@example.test'),
    ).rejects.toMatchObject({ code: 'lulu_ceiling_exceeded' });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('allows review after an explicit supplier validation rejection', async () => {
    mockSubmit.mockRejectedValue(new LuluHttpError(400));
    const result = await submitPrintOrder(
      order(),
      { confirmationId, confirmedTotalEur: 30 },
      'operator@example.test',
    );
    expect(result.fulfillment).toMatchObject({ status: 'manual_review', quote: null });
  });

  it('reconciles an ambiguous create without ever resubmitting it', async () => {
    mockSubmit.mockRejectedValue(new Error('lost supplier response'));
    mockFind.mockResolvedValue(null);
    const approval = { confirmationId, confirmedTotalEur: 30 };
    const actor = 'operator@example.test';
    const uncertain = await submitPrintOrder(order(), approval, actor);
    expect(uncertain.fulfillment.status).toBe('uncertain');
    expect(mockWrite.mock.calls.map(([values]) => values.status)).toEqual([
      'submitting',
      'uncertain',
    ]);
    await submitPrintOrder(uncertain, approval, actor);
    expect((await reconcilePrintOrder(uncertain)).fulfillment.status).toBe('uncertain');
    expect(mockFind).toHaveBeenCalledWith(id);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });
});

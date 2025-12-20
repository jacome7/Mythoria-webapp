/** @jest-environment node */

import { McpAuthError, type McpAuthContext } from './auth';
import { createMcpServer } from './server';
import { DEFAULT_CURRENCY } from '@/config/currency';
import { creditPackagesService, creditService, paymentService, storyService } from '@/db/services';

jest.mock('@/db/services', () => ({
  faqService: {
    getFaqData: jest.fn().mockResolvedValue([]),
    searchFaqs: jest.fn().mockResolvedValue([]),
  },
  storyService: {
    getStoriesByAuthor: jest.fn(),
  },
  creditService: {
    getAuthorCreditBalance: jest.fn(),
    getCreditHistory: jest.fn(),
  },
  paymentService: {
    getUserPaymentHistory: jest.fn(),
  },
  creditPackagesService: {
    getActiveCreditPackages: jest.fn(),
  },
}));

const mockAuthor = {
  authorId: 'author-1',
  clerkUserId: 'clerk-1',
  displayName: 'Test Author',
  email: 'author@example.com',
  notificationPreference: 'inspiration',
  createdAt: new Date(),
} as unknown as McpAuthContext['author'];

function getToolHandler(name: string, context: McpAuthContext) {
  const server = createMcpServer(context);
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: Function }> })._registeredTools;
  return tools[name].handler;
}

describe('stories.listMine tool', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;

  it('returns authored stories for an authenticated user', async () => {
    mockedStoryService.getStoriesByAuthor.mockResolvedValue([
      {
        storyId: 'story-1',
        title: 'First Tale',
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        isPublic: true,
        isFeatured: false,
      },
      {
        storyId: 'story-2',
        title: 'Temp Draft',
        status: 'temporary',
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-02'),
        storyLanguage: 'en-US',
        targetAudience: 'adult_18+',
        graphicalStyle: 'anime',
        isPublic: false,
        isFeatured: false,
      },
    ] as any);

    const handler = getToolHandler('stories.listMine', { userId: 'user-1', author: mockAuthor });
    const result = await handler({});
    const payload = JSON.parse(result.content[0].text);

    expect(mockedStoryService.getStoriesByAuthor).toHaveBeenCalledWith('author-1');
    expect(payload.authorId).toBe('author-1');
    expect(payload.total).toBe(1); // temporary story excluded by default
    expect(payload.stories[0]).toMatchObject({ id: 'story-1', status: 'published' });
  });

  it('throws auth error when no author is present', async () => {
    const handler = getToolHandler('stories.listMine', { userId: null, author: null });
    await expect(handler({})).rejects.toBeInstanceOf(McpAuthError);
  });
});

describe('credits.usage tool', () => {
  const mockedCreditService = creditService as jest.Mocked<typeof creditService>;

  it('returns balance and history for an authenticated user', async () => {
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(42);
    mockedCreditService.getCreditHistory.mockResolvedValue([
      {
        id: 'ledger-1',
        amount: 10,
        creditEventType: 'creditPurchase',
        createdAt: new Date('2024-03-01'),
        storyId: 'story-1',
        purchaseId: 'purchase-1',
      },
    ] as any);

    const handler = getToolHandler('credits.usage', { userId: 'user-1', author: mockAuthor });
    const result = await handler({ limit: 25 });
    const payload = JSON.parse(result.content[0].text);

    expect(mockedCreditService.getAuthorCreditBalance).toHaveBeenCalledWith('author-1');
    expect(mockedCreditService.getCreditHistory).toHaveBeenCalledWith('author-1', 25);
    expect(payload.balance).toBe(42);
    expect(payload.entries[0]).toMatchObject({ id: 'ledger-1', amount: 10, type: 'creditPurchase' });
  });

  it('throws auth error when token is missing', async () => {
    const handler = getToolHandler('credits.usage', { userId: null, author: null });
    await expect(handler({})).rejects.toBeInstanceOf(McpAuthError);
  });
});

describe('transactions.list tool', () => {
  const mockedPaymentService = paymentService as jest.Mocked<typeof paymentService>;

  it('returns transactions for authenticated user', async () => {
    mockedPaymentService.getUserPaymentHistory.mockResolvedValue([
      {
        id: 'tx-1',
        revolutOrderId: 'rev-1',
        creditBundle: { credits: 10, price: '9.00' },
        amount: '9.00',
        currency: DEFAULT_CURRENCY,
        status: 'completed',
        provider: 'revolut',
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-04-01'),
      },
    ] as any);

    const handler = getToolHandler('transactions.list', { userId: 'user-1', author: mockAuthor });
    const result = await handler({ limit: 10 });
    const payload = JSON.parse(result.content[0].text);

    expect(mockedPaymentService.getUserPaymentHistory).toHaveBeenCalledWith('author-1', 10);
    expect(payload.transactions).toHaveLength(1);
    expect(payload.transactions[0]).toMatchObject({ id: 'tx-1', providerOrderId: 'rev-1' });
  });

  it('rejects missing auth', async () => {
    const handler = getToolHandler('transactions.list', { userId: null, author: null });
    await expect(handler({})).rejects.toBeInstanceOf(McpAuthError);
  });
});

describe('credits.purchaseOptions tool', () => {
  const mockedCreditPackagesService = creditPackagesService as jest.Mocked<typeof creditPackagesService>;

  it('lists active credit packages without auth', async () => {
    mockedCreditPackagesService.getActiveCreditPackages.mockResolvedValue([
      {
        id: 'pkg-1',
        key: 'credits10',
        credits: 10,
        price: '9.00',
        currency: DEFAULT_CURRENCY,
        bestValue: false,
        popular: true,
        icon: 'star',
      },
    ] as any);

    const handler = getToolHandler('credits.purchaseOptions', { userId: null, author: null });
    const result = await handler();
    const payload = JSON.parse(result.content[0].text);

    expect(mockedCreditPackagesService.getActiveCreditPackages).toHaveBeenCalled();
    expect(payload.total).toBe(1);
    expect(payload.options[0]).toMatchObject({ key: 'credits10', credits: 10 });
  });
});

describe('fulfillment tools', () => {
  it('queues download job with jobId', async () => {
    const handler = getToolHandler('stories.requestDownload', { userId: 'user-1', author: mockAuthor });
    const result = await handler({ storyId: 'story-123', format: 'pdf' });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.type).toBe('download');
    expect(payload.storyId).toBe('story-123');
    expect(payload.jobId).toBeTruthy();
  });

  it('blocks fulfillment without auth', async () => {
    const handler = getToolHandler('stories.requestNarrate', { userId: null, author: null });
    await expect(handler({ storyId: 'story-123' })).rejects.toBeInstanceOf(McpAuthError);
  });
});

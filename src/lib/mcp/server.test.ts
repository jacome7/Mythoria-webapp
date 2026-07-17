/** @jest-environment node */

import { type McpAuthContext } from './auth';
import { createMcpServer, handleMcpHttpRequest } from './server';
import { DEFAULT_CURRENCY } from '@/config/currency';
import {
  chapterService,
  characterService,
  creditPackagesService,
  creditService,
  paymentService,
  printRequestService,
  pricingService,
  storyCharacterService,
  storyService,
} from '@/db/services';

const publishStoryRequestMock = jest.fn();
const publishAudiobookRequestMock = jest.fn();
const startStoryGenerationMock = jest.fn();

jest.mock('@/lib/pubsub', () => ({
  publishStoryRequest: (...args: unknown[]) => publishStoryRequestMock(...args),
  publishAudiobookRequest: (...args: unknown[]) => publishAudiobookRequestMock(...args),
}));

jest.mock('@/lib/story-generation', () => ({
  startStoryGeneration: (...args: unknown[]) => startStoryGenerationMock(...args),
}));

jest.mock('@/db/services', () => ({
  faqService: {
    getFaqData: jest.fn().mockResolvedValue([]),
    searchFaqs: jest.fn().mockResolvedValue([]),
  },
  storyService: {
    createStory: jest.fn(),
    updateStory: jest.fn(),
    getStoriesByAuthor: jest.fn(),
    getFeaturedPublicStories: jest.fn().mockResolvedValue([]),
    getStoryById: jest.fn().mockResolvedValue(null),
    getStoryBySlug: jest.fn().mockResolvedValue(null),
    getShareState: jest.fn().mockResolvedValue(null),
    createShareLink: jest.fn().mockResolvedValue(null),
    setPublicVisibility: jest.fn().mockResolvedValue(null),
    revokeShareLinks: jest.fn().mockResolvedValue(null),
  },
  characterService: {
    getCharacterById: jest.fn().mockResolvedValue(null),
    createCharacter: jest.fn(),
  },
  storyCharacterService: {
    getCharactersByStory: jest.fn().mockResolvedValue([]),
    addCharacterToStory: jest.fn(),
  },
  chapterService: {
    getStoryChapter: jest.fn().mockResolvedValue(null),
    getStoryChapters: jest.fn().mockResolvedValue([]),
  },
  creditService: {
    getAuthorCreditBalance: jest.fn(),
    getCreditHistory: jest.fn(),
    deductCredits: jest.fn(),
    addCredits: jest.fn(),
  },
  pricingService: {
    calculateCreditsForFeatures: jest.fn(),
    getPricingByServiceCode: jest.fn(),
  },
  paymentService: {
    getUserPaymentHistory: jest.fn(),
  },
  printRequestService: {
    getLatestByStoryAndAuthor: jest.fn().mockResolvedValue(null),
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

const protectedScope = 'profile';
const allScopes = [protectedScope, 'email', 'offline_access'];
const protectedSecuritySchemes = [{ type: 'oauth2', scopes: [protectedScope] }];
const mixedAccessSecuritySchemes = [
  { type: 'noauth' },
  { type: 'oauth2', scopes: [protectedScope] },
];

const anonymousContext: McpAuthContext = {
  userId: null,
  author: null,
  scopes: [],
  tokenType: null,
  tokenPresented: false,
  authError: null,
};

const authenticatedContext: McpAuthContext = {
  userId: 'user-1',
  author: mockAuthor,
  scopes: allScopes,
  tokenType: 'oauth_token',
  tokenPresented: true,
  authError: null,
};

function getToolHandler(name: string, context: McpAuthContext) {
  const server = createMcpServer(context);
  const tools = (server as unknown as { _registeredTools: Record<string, { handler: Function }> })
    ._registeredTools;
  return tools[name].handler;
}

describe('mythoria.discovery tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;
  const mockedChapterService = chapterService as jest.Mocked<typeof chapterService>;

  it('returns capabilities summary', async () => {
    const handler = getToolHandler('mythoria.discovery.capabilities', anonymousContext);
    const result = await handler({ locale: 'en-US' });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.app.name).toBe('Mythoria');
    expect(payload.locale).toBe('en-US');
    expect(Array.isArray(payload.supportedWorkflows)).toBe(true);
  });

  it('returns a noauth sample story preview from featured stories', async () => {
    mockedStoryService.getFeaturedPublicStories.mockResolvedValueOnce([
      {
        storyId: 'story-123',
        title: 'Dragon Friends',
        slug: 'dragon-friends',
        author: 'Test Author',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        storyLanguage: 'en-US',
        featureImageUri: 'https://img.example/story.jpg',
        averageRating: 4.8,
        ratingCount: 14,
      },
    ] as any);
    mockedStoryService.getStoryById.mockResolvedValueOnce({
      storyId: 'story-123',
      synopsis: 'Two sisters befriend a dragon in a moonlit valley.',
      coverUri: 'https://img.example/cover.jpg',
      featureImageUri: 'https://img.example/feature.jpg',
    } as any);
    mockedChapterService.getStoryChapter.mockResolvedValueOnce({
      chapterNumber: 1,
      htmlContent: '<p>Once upon a time there were two sisters.</p>',
      imageUri: 'https://img.example/chapter.jpg',
      audioUri: 'gs://audio-file',
    } as any);

    const handler = getToolHandler('mythoria.discovery.sample_story_preview', anonymousContext);
    const result = await handler({ locale: 'en-US' });
    const payload = JSON.parse(result.content[0].text);

    expect(payload.available).toBe(true);
    expect(payload.sample.title).toBe('Dragon Friends');
    expect(payload.sample.readUrl).toContain('/en-US/p/dragon-friends');
    expect(payload.sample.audioPreviewUrl).toContain('/api/p/dragon-friends/audio/0');
  });
});

describe('mythoria.coach.story_guidance tool', () => {
  it('routes product/account intents to FAQ tools', async () => {
    const handler = getToolHandler('mythoria.coach.story_guidance', anonymousContext);
    const result = await handler({
      locale: 'en-US',
      request: 'How many credits do I need and how can I pay?',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.intent).toBe('product_info');
    expect(payload.status).toBe('route_to_faq');
    expect(payload.recommendedNextTools).toContain('mythoria.help.search');
  });

  it('returns creative coaching checklist for writing requests', async () => {
    const handler = getToolHandler('mythoria.coach.story_guidance', anonymousContext);
    const result = await handler({
      locale: 'en-US',
      request: 'Help me write a cozy fantasy opening about a shy fox.',
      targetAudience: 'children_7-10',
      novelStyle: 'fantasy',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.intent).toBe('creative_coaching');
    expect(payload.status).toBe('coaching_ready');
    expect(Array.isArray(payload.coaching.checklist)).toBe(true);
    expect(payload.coaching.openingExample).toContain('Opening example');
  });
});

describe('mythoria.account.story_list tool', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;

  it('returns filtered, paginated stories for an authenticated user', async () => {
    mockedStoryService.getStoriesByAuthor.mockResolvedValue([
      {
        storyId: 'story-1',
        title: 'First Tale',
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        chapterCount: 6,
        hasAudio: true,
        slug: 'first-tale',
        isPublic: true,
        isFeatured: false,
      },
      {
        storyId: 'story-2',
        title: 'Second Tale',
        status: 'published',
        createdAt: new Date('2024-01-03'),
        updatedAt: new Date('2024-01-04'),
        storyLanguage: 'en-US',
        targetAudience: 'adult_18+',
        graphicalStyle: 'anime',
        chapterCount: 8,
        hasAudio: false,
        slug: null,
        isPublic: false,
        isFeatured: false,
      },
      {
        storyId: 'story-3',
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

    const handler = getToolHandler('mythoria.account.story_list', authenticatedContext);
    const firstPage = await handler({ status: 'published', limit: 1 });
    const firstPayload = firstPage.structuredContent as Record<string, any>;

    expect(mockedStoryService.getStoriesByAuthor).toHaveBeenCalledWith('author-1');
    expect(firstPayload.authorId).toBe('author-1');
    expect(firstPayload.total).toBe(2); // temporary story excluded by default
    expect(firstPayload.returned).toBe(1);
    expect(firstPayload.pagination.hasMore).toBe(true);
    expect(firstPayload.pagination.nextCursor).toBeTruthy();
    expect(firstPage._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(firstPage._meta?.['openai/outputTemplate']).toBe('ui://mythoria/story-library-v1.html');
    expect(firstPayload.stories[0]).toMatchObject({
      id: 'story-1',
      status: 'published',
      hasAudio: true,
      chapterCount: 6,
    });
    expect(firstPayload.stories[0].nextActions.some((action: any) => action.id === 'read')).toBe(
      true,
    );

    const secondPage = await handler({
      status: 'published',
      limit: 1,
      cursor: firstPayload.pagination.nextCursor,
    });
    const secondPayload = secondPage.structuredContent as Record<string, any>;
    expect(secondPayload.returned).toBe(1);
    expect(secondPayload.stories[0]).toMatchObject({ id: 'story-2', hasAudio: false });
  });

  it('returns auth challenge metadata when no author is present', async () => {
    const handler = getToolHandler('mythoria.account.story_list', anonymousContext);
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toMatch(/invalid_token/);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('mythoria.account.story_select tool', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;

  it('selects a story when there is a single exact title match', async () => {
    mockedStoryService.getStoriesByAuthor.mockResolvedValue([
      {
        storyId: 'story-1',
        title: 'Moon Garden',
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        chapterCount: 6,
        hasAudio: true,
        slug: 'moon-garden',
        isPublic: true,
        isFeatured: false,
      },
      {
        storyId: 'story-2',
        title: 'Forest Song',
        status: 'published',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-03'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        chapterCount: 6,
        hasAudio: false,
        slug: 'forest-song',
        isPublic: true,
        isFeatured: false,
      },
    ] as any);

    const handler = getToolHandler('mythoria.account.story_select', authenticatedContext);
    const result = await handler({ title: 'Moon Garden' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.selection.status).toBe('selected');
    expect(payload.story).toMatchObject({ id: 'story-1', title: 'Moon Garden' });
  });

  it('returns candidates when selection is ambiguous', async () => {
    mockedStoryService.getStoriesByAuthor.mockResolvedValue([
      {
        storyId: 'story-1',
        title: 'Moon Garden',
        status: 'published',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-05'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        chapterCount: 6,
        hasAudio: true,
        slug: 'moon-garden',
        isPublic: true,
        isFeatured: false,
      },
      {
        storyId: 'story-2',
        title: 'Moon Garden Remix',
        status: 'published',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-04'),
        storyLanguage: 'en-US',
        targetAudience: 'all_ages',
        graphicalStyle: 'cartoon',
        chapterCount: 6,
        hasAudio: false,
        slug: 'moon-garden-remix',
        isPublic: true,
        isFeatured: false,
      },
    ] as any);

    const handler = getToolHandler('mythoria.account.story_select', authenticatedContext);
    const result = await handler({ query: 'moon' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.selection.status).toBe('ambiguous');
    expect(payload.candidates).toHaveLength(2);
  });

  it('returns auth challenge metadata when unauthenticated', async () => {
    const handler = getToolHandler('mythoria.account.story_select', anonymousContext);
    const result = await handler({ query: 'moon' });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('story sharing tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns sharing state for authenticated users', async () => {
    mockedStoryService.getShareState.mockResolvedValue({
      story: {
        storyId: 'story-1',
        title: 'Moon Garden',
        slug: 'moon-garden',
        isPublic: true,
        updatedAt: new Date('2024-01-06'),
      },
      links: [
        {
          id: 'link-1',
          storyId: 'story-1',
          accessLevel: 'view',
          revoked: false,
          expiresAt: new Date('2099-01-01'),
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-05'),
        },
      ],
    } as any);

    const handler = getToolHandler('mythoria.story.share_state', authenticatedContext);
    const result = await handler({ storyId: 'story-1', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.story).toMatchObject({
      id: 'story-1',
      isPublic: true,
      publicUrl: expect.stringContaining('/en-US/p/moon-garden'),
    });
    expect(payload.sharing.activePrivateLinkCount).toBe(1);
    expect(payload.recommendedNextTools).toContain('mythoria.story.share_create_link');
  });

  it('requires confirmation for public sharing', async () => {
    mockedStoryService.getShareState.mockResolvedValue({
      story: {
        storyId: 'story-1',
        title: 'Moon Garden',
        slug: null,
        isPublic: false,
        updatedAt: new Date('2024-01-06'),
      },
      links: [],
    } as any);

    const handler = getToolHandler('mythoria.story.share_create_link', authenticatedContext);
    const result = await handler({
      storyId: 'story-1',
      mode: 'public',
      confirmPublicExposure: false,
      locale: 'en-US',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('confirmation_required');
    expect(payload.sideEffects.externalVisibility).toBe(true);
  });

  it('revokes sharing links after explicit confirmation', async () => {
    mockedStoryService.revokeShareLinks.mockResolvedValue({
      revokedCount: 2,
      visibilityUpdated: true,
    } as any);
    mockedStoryService.getShareState.mockResolvedValue({
      story: {
        storyId: 'story-1',
        title: 'Moon Garden',
        slug: 'moon-garden',
        isPublic: false,
        updatedAt: new Date('2024-01-06'),
      },
      links: [],
    } as any);

    const handler = getToolHandler('mythoria.story.share_revoke_link', authenticatedContext);
    const result = await handler({
      storyId: 'story-1',
      revokeAll: true,
      disablePublic: true,
      confirmRevoke: true,
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('updated');
    expect(payload.result.revokedCount).toBe(2);
    expect(payload.result.publicVisibilityDisabled).toBe(true);
  });
});

describe('mythoria.credits.check_eligibility tool', () => {
  const mockedCreditService = creditService as jest.Mocked<typeof creditService>;
  const mockedPricingService = pricingService as jest.Mocked<typeof pricingService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns eligible=true when balance covers audiobook action', async () => {
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(12);
    mockedPricingService.getPricingByServiceCode.mockResolvedValue({
      credits: 3,
    } as any);

    const handler = getToolHandler('mythoria.credits.check_eligibility', authenticatedContext);
    const result = await handler({ action: 'audiobook', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.eligibility).toMatchObject({
      eligible: true,
      requiredCredits: 3,
      availableCredits: 12,
      shortfall: 0,
    });
    expect(payload.recommendedNextTools).toContain('mythoria.story.narration_request');
  });

  it('returns insufficient guidance when user lacks credits', async () => {
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(1);
    mockedPricingService.getPricingByServiceCode.mockResolvedValue({
      credits: 10,
    } as any);

    const handler = getToolHandler('mythoria.credits.check_eligibility', authenticatedContext);
    const result = await handler({ action: 'print', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.eligibility).toMatchObject({
      eligible: false,
      requiredCredits: 10,
      availableCredits: 1,
      shortfall: 9,
    });
    expect(payload.recommendedNextTools).toEqual([
      'mythoria.account.credit_usage',
      'mythoria.account.payment_history',
    ]);
  });

  it('returns auth challenge metadata for anonymous users', async () => {
    const handler = getToolHandler('mythoria.credits.check_eligibility', anonymousContext);
    const result = await handler({ action: 'ebook' });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('story reading tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;
  const mockedChapterService = chapterService as jest.Mocked<typeof chapterService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns story overview with chapter preview for owner access', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-read-1',
      authorId: 'author-1',
      title: 'Moon Garden',
      status: 'published',
      storyLanguage: 'en-US',
      targetAudience: 'all_ages',
      novelStyle: 'fantasy',
      graphicalStyle: 'watercolor',
      synopsis: 'A moonlit adventure.',
      dedicationMessage: null,
      hasAudio: true,
      isPublic: false,
      slug: 'moon-garden',
    } as any);
    mockedChapterService.getStoryChapters.mockResolvedValue([
      {
        chapterNumber: 1,
        title: 'Chapter One',
        htmlContent: '<p>Once upon a moonlit night.</p>',
        imageUri: null,
        audioUri: null,
      },
      {
        chapterNumber: 2,
        title: 'Chapter Two',
        htmlContent: '<p>The garden woke up.</p>',
        imageUri: null,
        audioUri: null,
      },
    ] as any);

    const handler = getToolHandler('mythoria.story.read_overview', authenticatedContext);
    const result = await handler({ storyId: 'story-read-1', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('ok');
    expect(payload.accessLevel).toBe('owner');
    expect(payload.story).toMatchObject({ id: 'story-read-1', title: 'Moon Garden' });
    expect(payload.chapters.total).toBe(2);
    expect(payload.preview.chapterNumber).toBe(1);
  });

  it('allows anonymous chapter reading for public stories', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-public-1',
      authorId: 'author-public',
      title: 'Public Moon',
      status: 'published',
      storyLanguage: 'en-US',
      hasAudio: false,
      isPublic: true,
      slug: 'public-moon',
    } as any);
    mockedChapterService.getStoryChapters.mockResolvedValue([
      {
        chapterNumber: 1,
        title: 'Opening',
        htmlContent: '<p>Welcome to the public moon story.</p>',
        imageUri: null,
        audioUri: null,
      },
    ] as any);

    const handler = getToolHandler('mythoria.story.read_chapter', anonymousContext);
    const result = await handler({
      storyId: 'story-public-1',
      chapterNumber: 1,
      mode: 'summary',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('ok');
    expect(payload.accessLevel).toBe('public');
    expect(payload.mode).toBe('summary');
    expect(payload.chapter.chapterNumber).toBe(1);
  });

  it('returns boundary response when requesting next chapter past the end', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-read-2',
      authorId: 'author-1',
      title: 'Single Chapter Story',
      status: 'published',
      storyLanguage: 'en-US',
      hasAudio: false,
      isPublic: false,
      slug: null,
    } as any);
    mockedChapterService.getStoryChapters.mockResolvedValue([
      {
        chapterNumber: 1,
        title: 'Only Chapter',
        htmlContent: '<p>Only one chapter exists.</p>',
        imageUri: null,
        audioUri: null,
      },
    ] as any);

    const handler = getToolHandler('mythoria.story.read_next_chapter', authenticatedContext);
    const result = await handler({
      storyId: 'story-read-2',
      currentChapterNumber: 1,
      direction: 'next',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('boundary_reached');
    expect(payload.direction).toBe('next');
  });

  it('returns auth challenge for private story reading when anonymous', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-private',
      authorId: 'author-private',
      title: 'Private Story',
      status: 'draft',
      storyLanguage: 'en-US',
      hasAudio: false,
      isPublic: false,
      slug: null,
    } as any);

    const handler = getToolHandler('mythoria.story.read_overview', anonymousContext);
    const result = await handler({
      storyId: 'story-private',
      locale: 'en-US',
    });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('story listening tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;
  const mockedChapterService = chapterService as jest.Mocked<typeof chapterService>;
  const mockedPricingService = pricingService as jest.Mocked<typeof pricingService>;
  const mockedCreditService = creditService as jest.Mocked<typeof creditService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns listening status with chapter entries for an owner story', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-audio-1',
      authorId: 'author-1',
      title: 'Audio Tale',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: false,
      slug: null,
      hasAudio: true,
      audiobookStatus: 'completed',
      chapterCount: 2,
      audiobookUri: null,
    } as any);
    mockedChapterService.getStoryChapters.mockResolvedValue([
      {
        chapterNumber: 1,
        title: 'One',
        htmlContent: '<p>One</p>',
        imageUri: null,
        audioUri: 'https://cdn.example/chapter-1.mp3',
      },
      {
        chapterNumber: 2,
        title: 'Two',
        htmlContent: '<p>Two</p>',
        imageUri: null,
        audioUri: 'https://cdn.example/chapter-2.mp3',
      },
    ] as any);

    const handler = getToolHandler('mythoria.story.audio_status', authenticatedContext);
    const result = await handler({ storyId: 'story-audio-1', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('audio_available');
    expect(payload.audiobook.generationStatus).toBe('completed');
    expect(payload.audiobook.availableAudioChapterNumbers).toEqual([1, 2]);
  });

  it('allows anonymous chapter playback lookup for public stories by slug', async () => {
    mockedStoryService.getStoryBySlug.mockResolvedValue({
      storyId: 'story-public-audio',
      authorId: 'author-public',
      title: 'Public Audio Story',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: true,
      slug: 'public-audio-story',
      hasAudio: true,
      audiobookStatus: 'completed',
      audiobookUri: null,
    } as any);
    mockedChapterService.getStoryChapters.mockResolvedValue([
      {
        chapterNumber: 1,
        title: 'Opening',
        htmlContent: '<p>Opening</p>',
        imageUri: null,
        audioUri: 'https://cdn.example/public-1.mp3',
      },
    ] as any);

    const handler = getToolHandler('mythoria.story.audio_chapter', anonymousContext);
    const result = await handler({ slug: 'public-audio-story', chapterNumber: 1 });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('ok');
    expect(payload.accessLevel).toBe('public');
    expect(payload.chapter.publicStreamUrl).toContain('/api/p/public-audio-story/audio/0');
  });

  it('returns auth challenge for anonymous access to private audio story', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-private-audio',
      authorId: 'author-private',
      title: 'Private Audio Story',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: false,
      slug: null,
      hasAudio: false,
      audiobookStatus: null,
    } as any);

    const handler = getToolHandler('mythoria.story.audio_status', anonymousContext);
    const result = await handler({ storyId: 'story-private-audio' });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });

  it('returns narration preview when confirmation is missing', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-narrate-preview',
      authorId: 'author-1',
      title: 'Narrate Me',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: false,
      slug: null,
      hasAudio: false,
      audiobookStatus: null,
    } as any);
    mockedPricingService.getPricingByServiceCode.mockResolvedValue({
      serviceCode: 'audioBookGeneration',
      credits: 5,
    } as any);
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(10);

    const handler = getToolHandler('mythoria.story.narration_request', authenticatedContext);
    const result = await handler({ storyId: 'story-narrate-preview', voiceId: 'coral' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.status).toBe('confirmation_required');
    expect(payload.creditCheck.required).toBe(5);
  });

  it('queues narration when confirmed and credits are sufficient', async () => {
    mockedStoryService.getStoryById
      .mockResolvedValueOnce({
        storyId: 'story-narrate-queue',
        authorId: 'author-1',
        title: 'Narrate Queue',
        status: 'published',
        storyLanguage: 'en-US',
        isPublic: false,
        slug: null,
        hasAudio: false,
        audiobookStatus: null,
      } as any)
      .mockResolvedValueOnce({
        storyId: 'story-narrate-queue',
        authorId: 'author-1',
        title: 'Narrate Queue',
        status: 'published',
        storyLanguage: 'en-US',
        isPublic: false,
        slug: null,
        hasAudio: false,
        audiobookStatus: 'generating',
      } as any);
    mockedPricingService.getPricingByServiceCode.mockResolvedValue({
      serviceCode: 'audioBookGeneration',
      credits: 4,
    } as any);
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(12);
    mockedCreditService.deductCredits.mockResolvedValue({ id: 'ledger-audio-1' } as any);
    mockedStoryService.updateStory.mockResolvedValue({
      storyId: 'story-narrate-queue',
      authorId: 'author-1',
      title: 'Narrate Queue',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: false,
      slug: null,
      hasAudio: false,
      audiobookStatus: 'generating',
    } as any);
    publishAudiobookRequestMock.mockResolvedValue('audio-msg-1');

    const handler = getToolHandler('mythoria.story.narration_request', authenticatedContext);
    const result = await handler({
      storyId: 'story-narrate-queue',
      voiceId: 'coral',
      confirmStart: true,
      includeBackgroundMusic: true,
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(mockedCreditService.deductCredits).toHaveBeenCalledWith(
      'author-1',
      4,
      'audioBookGeneration',
      'story-narrate-queue',
    );
    expect(publishAudiobookRequestMock).toHaveBeenCalled();
    expect(payload.status).toBe('queued');
    expect(payload.job.type).toBe('audiobook_generation');
    expect(typeof payload.job.jobId).toBe('string');
  });

  it('lists voice catalog without auth', async () => {
    const handler = getToolHandler('mythoria.story.voice_catalog', anonymousContext);
    const result = await handler({ locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.provider).toBeTruthy();
    expect(Array.isArray(payload.voices)).toBe(true);
    expect(payload.voices.length).toBeGreaterThan(0);
  });
});

describe('story creation tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;
  const mockedCharacterService = characterService as jest.Mocked<typeof characterService>;
  const mockedStoryCharacterService = storyCharacterService as jest.Mocked<
    typeof storyCharacterService
  >;
  const mockedPricingService = pricingService as jest.Mocked<typeof pricingService>;
  const mockedCreditService = creditService as jest.Mocked<typeof creditService>;

  const baseStory = {
    storyId: 'story-creation-1',
    authorId: 'author-1',
    title: 'Draft Title',
    status: 'draft',
    storyLanguage: 'en-US',
    targetAudience: null,
    novelStyle: null,
    graphicalStyle: null,
    literaryPersona: null,
    chapterCount: 6,
    place: null,
    plotDescription: null,
    additionalRequests: null,
    imageGenerationInstructions: null,
    customAuthor: null,
    dedicationMessage: null,
    isPublic: false,
    isFeatured: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a draft and reports missing required fields', async () => {
    mockedStoryService.createStory.mockResolvedValue({
      ...baseStory,
      storyId: 'story-new',
      title: 'My Story',
    });
    mockedStoryService.updateStory.mockResolvedValue({
      ...baseStory,
      storyId: 'story-new',
      title: 'My Story',
      chapterCount: 4,
    });

    const handler = getToolHandler('mythoria.story.create_draft', authenticatedContext);
    const result = await handler({ title: 'My Story', locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(mockedStoryService.createStory).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Story',
        authorId: 'author-1',
        status: 'draft',
      }),
    );
    expect(payload.story.storyId).toBe('story-new');
    expect(payload.story.readyToGenerate).toBe(false);
    expect(payload.story.missingRequiredFields).toEqual([
      'targetAudience',
      'novelStyle',
      'graphicalStyle',
    ]);
  });

  it('updates a draft and marks it ready when required fields are complete', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      ...baseStory,
      storyId: 'story-ready',
    });
    mockedStoryService.updateStory.mockResolvedValue({
      ...baseStory,
      storyId: 'story-ready',
      targetAudience: 'children_7-10',
      novelStyle: 'fantasy',
      graphicalStyle: 'watercolor',
      chapterCount: 6,
    });

    const handler = getToolHandler('mythoria.story.update_draft', authenticatedContext);
    const result = await handler({
      storyId: 'story-ready',
      targetAudience: 'children_7-10',
      novelStyle: 'fantasy',
      graphicalStyle: 'watercolor',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(mockedStoryService.updateStory).toHaveBeenCalledWith(
      'story-ready',
      expect.objectContaining({
        targetAudience: 'children_7-10',
        novelStyle: 'fantasy',
        graphicalStyle: 'watercolor',
      }),
    );
    expect(payload.story.readyToGenerate).toBe(true);
    expect(payload.story.missingRequiredFields).toEqual([]);
  });

  it('adds existing and new characters to the story', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      ...baseStory,
      storyId: 'story-characters',
    });
    mockedStoryCharacterService.getCharactersByStory.mockResolvedValue([]);
    mockedCharacterService.getCharacterById.mockResolvedValue({
      characterId: 'char-existing',
      authorId: 'author-1',
      name: 'Mia',
    } as any);
    mockedCharacterService.createCharacter.mockResolvedValue({
      characterId: 'char-new',
      authorId: 'author-1',
      name: 'Joao',
    } as any);

    const handler = getToolHandler('mythoria.story.add_characters', authenticatedContext);
    const result = await handler({
      storyId: 'story-characters',
      characters: [{ existingCharacterId: 'char-existing' }, { name: 'Joao' }],
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(mockedStoryCharacterService.addCharacterToStory).toHaveBeenCalledTimes(2);
    expect(payload.added).toHaveLength(2);
    expect(payload.skipped).toEqual([]);
  });

  it('starts generation when confirmed and credits are sufficient', async () => {
    mockedStoryService.getStoryById
      .mockResolvedValueOnce({
        ...baseStory,
        storyId: 'story-generate',
        targetAudience: 'children_7-10',
        novelStyle: 'fantasy',
        graphicalStyle: 'watercolor',
      } as any)
      .mockResolvedValueOnce({
        ...baseStory,
        storyId: 'story-generate',
        status: 'writing',
        targetAudience: 'children_7-10',
        novelStyle: 'fantasy',
        graphicalStyle: 'watercolor',
      } as any);
    mockedPricingService.calculateCreditsForFeatures.mockResolvedValue({
      total: 3,
      breakdown: [{ serviceCode: 'eBookGeneration', credits: 3 }],
    });
    mockedCreditService.getAuthorCreditBalance.mockResolvedValue(10);
    mockedStoryService.updateStory.mockResolvedValue({
      ...baseStory,
      storyId: 'story-generate',
      status: 'writing',
      targetAudience: 'children_7-10',
      novelStyle: 'fantasy',
      graphicalStyle: 'watercolor',
    } as any);
    startStoryGenerationMock.mockResolvedValue({
      runId: 'run-1',
      queueStatus: 'queued',
      remainingCredits: 7,
      duplicate: false,
    });

    const handler = getToolHandler('mythoria.story.start_generation', authenticatedContext);
    const result = await handler({
      storyId: 'story-generate',
      confirmStart: true,
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(startStoryGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        storyId: 'story-generate',
        features: { ebook: true, audiobook: false, printed: false },
      }),
    );
    expect(payload.status).toBe('queued');
    expect(payload.job.type).toBe('story_generation');
    expect(typeof payload.job.jobId).toBe('string');
    expect(payload.creditUsage.deducted).toBe(3);
  });
});

describe('mythoria.account.credit_usage tool', () => {
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

    const handler = getToolHandler('mythoria.account.credit_usage', authenticatedContext);
    const result = await handler({ limit: 25 });
    const payload = JSON.parse(result.content[0].text);

    expect(mockedCreditService.getAuthorCreditBalance).toHaveBeenCalledWith('author-1');
    expect(mockedCreditService.getCreditHistory).toHaveBeenCalledWith('author-1', 25);
    expect(payload.balance).toBe(42);
    expect(payload.entries[0]).toMatchObject({
      id: 'ledger-1',
      amount: 10,
      type: 'creditPurchase',
    });
  });

  it('returns auth challenge metadata when token is missing', async () => {
    const handler = getToolHandler('mythoria.account.credit_usage', anonymousContext);
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('mythoria.account.payment_history tool', () => {
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

    const handler = getToolHandler('mythoria.account.payment_history', authenticatedContext);
    const result = await handler({ limit: 10 });
    const payload = JSON.parse(result.content[0].text);

    expect(mockedPaymentService.getUserPaymentHistory).toHaveBeenCalledWith('author-1', 10);
    expect(payload.transactions).toHaveLength(1);
    expect(payload.transactions[0]).toMatchObject({ id: 'tx-1', providerOrderId: 'rev-1' });
  });

  it('returns auth challenge metadata for missing auth', async () => {
    const handler = getToolHandler('mythoria.account.payment_history', anonymousContext);
    const result = await handler({});

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('mythoria.catalog.credit_packages tool', () => {
  const mockedCreditPackagesService = creditPackagesService as jest.Mocked<
    typeof creditPackagesService
  >;

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

    const handler = getToolHandler('mythoria.catalog.credit_packages', anonymousContext);
    const result = await handler();
    const payload = JSON.parse(result.content[0].text);

    expect(mockedCreditPackagesService.getActiveCreditPackages).toHaveBeenCalled();
    expect(payload.total).toBe(1);
    expect(payload.options[0]).toMatchObject({ key: 'credits10', credits: 10 });
  });
});

describe('fulfillment tools', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;

  it('queues export job with trackable jobId', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-123',
      authorId: 'author-1',
      title: 'Exportable Story',
      status: 'published',
      storyLanguage: 'en-US',
      isPublic: false,
      hasAudio: false,
    } as any);
    const handler = getToolHandler('mythoria.story.export_request', authenticatedContext);
    const result = await handler({ storyId: 'story-123', format: 'pdf' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.type).toBe('export');
    expect(payload.storyId).toBe('story-123');
    expect(payload.jobId).toBeTruthy();
    expect(payload.recommendedNextTools).toContain('mythoria.jobs.status');
  });

  it('returns auth challenge for unauthenticated fulfillment', async () => {
    const handler = getToolHandler('mythoria.story.narration_request', anonymousContext);
    const result = await handler({ storyId: 'story-123' });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('mythoria.jobs.status tool', () => {
  const mockedStoryService = storyService as jest.Mocked<typeof storyService>;
  const mockedPrintRequestService = printRequestService as jest.Mocked<typeof printRequestService>;

  it('returns normalized running state for story generation jobs', async () => {
    const requestedAt = new Date(Date.now() - 30 * 1000).toISOString();
    const token = Buffer.from(
      JSON.stringify({
        type: 'story_generation',
        storyId: 'story-job-1',
        runId: 'run-1',
        requestedAt,
      }),
      'utf8',
    ).toString('base64url');
    const jobId = `mythoria-job:${token}`;

    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-job-1',
      authorId: 'author-1',
      title: 'Queued Story',
      status: 'writing',
      storyLanguage: 'en-US',
      storyGenerationStatus: 'running',
      storyGenerationCompletedPercentage: 42,
      hasAudio: false,
      isPublic: false,
      updatedAt: new Date('2024-06-01'),
    } as any);

    const handler = getToolHandler('mythoria.jobs.status', authenticatedContext);
    const result = await handler({ jobId, locale: 'en-US' });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.job.type).toBe('story_generation');
    expect(payload.job.state).toBe('running');
    expect(payload.job.progress).toBe(42);
  });

  it('returns print status details when print request exists', async () => {
    mockedStoryService.getStoryById.mockResolvedValue({
      storyId: 'story-job-print',
      authorId: 'author-1',
      title: 'Print Story',
      status: 'published',
      storyLanguage: 'en-US',
      hasAudio: false,
      isPublic: false,
      updatedAt: new Date('2024-06-01'),
    } as any);
    mockedPrintRequestService.getLatestByStoryAndAuthor.mockResolvedValue({
      id: 'print-1',
      status: 'in_printing',
      requestedAt: new Date('2024-06-01'),
      updatedAt: new Date('2024-06-02'),
      printedAt: null,
      pdfUrl: '',
    } as any);

    const handler = getToolHandler('mythoria.jobs.status', authenticatedContext);
    const result = await handler({
      jobType: 'print',
      storyId: 'story-job-print',
      locale: 'en-US',
    });
    const payload = result.structuredContent as Record<string, any>;

    expect(payload.job.type).toBe('print');
    expect(payload.job.state).toBe('running');
    expect(payload.details.printRequest.id).toBe('print-1');
  });

  it('returns auth challenge when unauthenticated', async () => {
    const handler = getToolHandler('mythoria.jobs.status', anonymousContext);
    const result = await handler({
      jobType: 'story_generation',
      storyId: 'story-job-anon',
    });

    expect(result.isError).toBe(true);
    expect(result._meta?.['mcp/www_authenticate']?.[0]).toContain(protectedScope);
  });
});

describe('tools/list metadata', () => {
  it('includes securitySchemes for public and protected tools', async () => {
    const response = await handleMcpHttpRequest(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'tools-list',
          method: 'tools/list',
          params: {},
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    const tools = body.result?.tools ?? [];

    const publicTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.discovery.ping',
    );
    const publicCoachTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.coach.story_guidance',
    );
    const protectedTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.account.story_list',
    );
    const protectedSelectTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.account.story_select',
    );
    const mixedAccessReadTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.read_overview',
    );
    const mixedAccessAudioTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.audio_status',
    );
    const publicVoiceCatalogTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.voice_catalog',
    );
    const sharingStateTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.share_state',
    );
    const sharingCreateTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.share_create_link',
    );
    const sharingRevokeTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.share_revoke_link',
    );
    const eligibilityTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.credits.check_eligibility',
    );
    const storyWriteTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.story.create_draft',
    );
    const jobsStatusTool = tools.find(
      (tool: { name: string }) => tool.name === 'mythoria.jobs.status',
    );

    expect(publicTool.securitySchemes).toEqual([{ type: 'noauth' }]);
    expect(publicTool._meta?.securitySchemes).toEqual([{ type: 'noauth' }]);
    expect(publicCoachTool.securitySchemes).toEqual([{ type: 'noauth' }]);
    expect(publicCoachTool._meta?.securitySchemes).toEqual([{ type: 'noauth' }]);

    expect(protectedTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(protectedTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(protectedSelectTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(protectedSelectTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(mixedAccessReadTool.securitySchemes).toEqual(mixedAccessSecuritySchemes);
    expect(mixedAccessReadTool._meta?.securitySchemes).toEqual(mixedAccessSecuritySchemes);
    expect(mixedAccessAudioTool.securitySchemes).toEqual(mixedAccessSecuritySchemes);
    expect(mixedAccessAudioTool._meta?.securitySchemes).toEqual(mixedAccessSecuritySchemes);
    expect(publicVoiceCatalogTool.securitySchemes).toEqual([{ type: 'noauth' }]);
    expect(publicVoiceCatalogTool._meta?.securitySchemes).toEqual([{ type: 'noauth' }]);

    expect(sharingStateTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(sharingStateTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(sharingCreateTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(sharingCreateTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(sharingRevokeTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(sharingRevokeTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(eligibilityTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(eligibilityTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);

    expect(storyWriteTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(storyWriteTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);

    expect(jobsStatusTool.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(jobsStatusTool._meta?.securitySchemes).toEqual(protectedSecuritySchemes);
    expect(publicCoachTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-creation-v1.html');
    expect(storyWriteTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-creation-v1.html');
    expect(protectedTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(sharingStateTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(sharingCreateTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(sharingRevokeTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(mixedAccessReadTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-reader-v1.html');
    expect(jobsStatusTool._meta?.ui?.resourceUri).toBe('ui://mythoria/story-reader-v1.html');
    expect(storyWriteTool._meta?.['openai/outputTemplate']).toBe(
      'ui://mythoria/story-creation-v1.html',
    );
    expect(storyWriteTool._meta?.['openai/toolInvocation/invoking']).toBe('Creating draft...');
    expect(storyWriteTool._meta?.['openai/toolInvocation/invoked']).toBe('Draft updated.');
  });
});

describe('resources metadata', () => {
  it('lists and serves registered MCP app widgets', async () => {
    const listResponse = await handleMcpHttpRequest(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'resources-list',
          method: 'resources/list',
          params: {},
        }),
      }),
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    const resources = listBody.result?.resources ?? [];
    const creationWidget = resources.find(
      (resource: { uri?: string }) => resource.uri === 'ui://mythoria/story-creation-v1.html',
    );
    const libraryWidget = resources.find(
      (resource: { uri?: string }) => resource.uri === 'ui://mythoria/story-library-v1.html',
    );
    const readerWidget = resources.find(
      (resource: { uri?: string }) => resource.uri === 'ui://mythoria/story-reader-v1.html',
    );

    expect(Array.isArray(resources)).toBe(true);
    expect(creationWidget?.mimeType).toBe('text/html;profile=mcp-app');
    expect(libraryWidget?.mimeType).toBe('text/html;profile=mcp-app');
    expect(readerWidget?.mimeType).toBe('text/html;profile=mcp-app');

    const readResponse = await handleMcpHttpRequest(
      new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'resources-read',
          method: 'resources/read',
          params: {
            uri: 'ui://mythoria/story-reader-v1.html',
          },
        }),
      }),
    );

    expect(readResponse.status).toBe(200);
    const readBody = await readResponse.json();
    const firstContent = readBody.result?.contents?.[0];
    expect(firstContent?.mimeType).toBe('text/html;profile=mcp-app');
    expect(firstContent?.uri).toBe('ui://mythoria/story-reader-v1.html');
    expect(typeof firstContent?.text).toBe('string');
    expect(firstContent?._meta?.ui?.csp?.connectDomains?.length).toBeGreaterThan(0);
    expect(firstContent?._meta?.['openai/widgetDescription']).toBeTruthy();
  });
});

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

const getPublicStorySeoDataMock = jest.fn();

jest.mock('@/db/services', () => ({
  storyService: {
    getPublicStorySeoData: (...args: unknown[]) => getPublicStorySeoDataMock(...args),
  },
}));

jest.mock('./PublicStoryPageClient', () => ({
  __esModule: true,
  default: () => 'PublicStoryPageClient',
}));

jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  permanentRedirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import PublicStoryPage from './page';

describe('public story page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a real 404 for missing story slugs', async () => {
    getPublicStorySeoDataMock.mockResolvedValue(null);

    await expect(
      PublicStoryPage({
        params: Promise.resolve({ locale: 'en-US', slug: 'missing-story' }),
      }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('redirects non-native locales to the canonical public story locale', async () => {
    getPublicStorySeoDataMock.mockResolvedValue({
      storyLanguage: 'pt-PT',
      title: 'Native Story',
    });

    await expect(
      PublicStoryPage({
        params: Promise.resolve({ locale: 'en-US', slug: 'native-story' }),
      }),
    ).rejects.toThrow('REDIRECT:/pt-PT/p/native-story');
  });

  it('renders the page when the request already uses the canonical locale', async () => {
    getPublicStorySeoDataMock.mockResolvedValue({
      storyLanguage: 'en-US',
      title: 'Native Story',
    });

    await expect(
      PublicStoryPage({
        params: Promise.resolve({ locale: 'en-US', slug: 'native-story' }),
      }),
    ).resolves.toBeTruthy();
  });
});

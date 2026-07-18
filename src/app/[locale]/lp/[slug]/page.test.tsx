import { render, screen } from '@testing-library/react';

const notFoundMock = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const permanentRedirectMock = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

jest.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
  permanentRedirect: (url: string) => permanentRedirectMock(url),
}));

jest.mock('next-intl/server', () => ({
  setRequestLocale: jest.fn(),
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

jest.mock('@/components/landing-pages/LandingPageTemplate', () => ({
  __esModule: true,
  default: ({ page }: { page: { slug: string } }) => <div data-testid="landing">{page.slug}</div>,
}));

import LandingPageRoute, { generateMetadata } from './page';

describe('romance landing page route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('publishes indexable canonical metadata after approval', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: 'pt-PT',
        slug: 'livro-personalizado-para-casais',
      }),
    });

    expect(metadata.alternates?.canonical).toBe(
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-para-casais',
    );
    expect(metadata.robots).toBe('index,follow,max-snippet:-1,max-image-preview:large');
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringContaining('/romance-og.jpeg'),
        width: 1200,
        height: 630,
      }),
    ]);
  });

  it('renders the canonical Portuguese route', async () => {
    const result = await LandingPageRoute({
      params: Promise.resolve({
        locale: 'pt-PT',
        slug: 'livro-personalizado-para-casais',
      }),
    });

    render(result);
    expect(screen.getByTestId('landing')).toHaveTextContent('livro-personalizado-para-casais');
  });

  it('redirects another supported locale to the canonical Portuguese URL', async () => {
    await expect(
      LandingPageRoute({
        params: Promise.resolve({
          locale: 'en-US',
          slug: 'livro-personalizado-para-casais',
        }),
      }),
    ).rejects.toThrow('NEXT_REDIRECT:/pt-PT/lp/livro-personalizado-para-casais');
    expect(permanentRedirectMock).toHaveBeenCalledWith('/pt-PT/lp/livro-personalizado-para-casais');
  });

  it('returns not found for an unknown slug', async () => {
    await expect(
      LandingPageRoute({
        params: Promise.resolve({ locale: 'pt-PT', slug: 'nao-existe' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});

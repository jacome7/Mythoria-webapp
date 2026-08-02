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

  it('publishes the travel landing with a unique canonical and indexable metadata', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: 'pt-PT',
        slug: 'livro-personalizado-ferias',
      }),
    });

    expect(metadata.alternates?.canonical).toBe(
      'https://mythoria.pt/pt-PT/lp/livro-personalizado-ferias',
    );
    expect(metadata.robots).toBe('index,follow,max-snippet:-1,max-image-preview:large');
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringContaining(
          '/landing-pages/livro-personalizado-ferias/assets/hero/og-cover.jpeg',
        ),
        width: 1200,
        height: 630,
      }),
    ]);
  });

  it('publishes reciprocal localized hreflang without a German alternate', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en-US', slug: 'personalized-vacation-book' }),
    });

    expect(metadata.alternates?.canonical).toBe(
      'https://mythoria.pt/en-US/lp/personalized-vacation-book',
    );
    expect(metadata.alternates?.languages).toEqual({
      'pt-PT': 'https://mythoria.pt/pt-PT/lp/livro-personalizado-ferias',
      'en-US': 'https://mythoria.pt/en-US/lp/personalized-vacation-book',
      'es-ES': 'https://mythoria.pt/es-ES/lp/libro-personalizado-vacaciones',
      'fr-FR': 'https://mythoria.pt/fr-FR/lp/livre-personnalise-vacances',
    });
    expect(metadata.openGraph?.locale).toBe('en-US');
  });

  it('renders an existing localized route', async () => {
    const result = await LandingPageRoute({
      params: Promise.resolve({ locale: 'es-ES', slug: 'libro-personalizado-para-parejas' }),
    });
    render(result);
    expect(screen.getByTestId('landing')).toHaveTextContent('libro-personalizado-para-parejas');
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

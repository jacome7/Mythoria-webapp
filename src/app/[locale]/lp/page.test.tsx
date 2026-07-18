jest.mock('next-intl/server', () => ({
  setRequestLocale: jest.fn(),
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

import { render, screen } from '@testing-library/react';
import LandingPageIndexRoute, { generateMetadata } from './page';

describe('landing page index metadata', () => {
  it('indexes the canonical Portuguese landing page index', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'pt-PT' }),
    });

    expect(metadata.robots).toBe('index,follow,max-snippet:-1,max-image-preview:large');
    expect(metadata.alternates?.canonical).toBe('https://mythoria.pt/pt-PT/lp');
  });

  it('keeps duplicate locale landing page indexes out of the index', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'en-US' }),
    });

    expect(metadata.robots).toBe('noindex,follow');
    expect(metadata.alternates?.canonical).toBe('https://mythoria.pt/pt-PT/lp');
  });

  it('links to the romance landing page from the Portuguese index', async () => {
    render(
      await LandingPageIndexRoute({
        params: Promise.resolve({ locale: 'pt-PT' }),
      }),
    );

    expect(screen.getByRole('link', { name: /Livro personalizado para casais/i })).toHaveAttribute(
      'href',
      '/pt-PT/lp/livro-personalizado-para-casais',
    );
  });
});

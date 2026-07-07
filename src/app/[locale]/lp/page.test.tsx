jest.mock('next-intl/server', () => ({
  setRequestLocale: jest.fn(),
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'],
  },
}));

import { generateMetadata } from './page';

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
});

import { render, screen } from '@testing-library/react';
import SampleBookPage, { generateMetadata } from './page';
import { getSampleBookBySlug } from '@/lib/sample-books/catalog';
import { getTemplateForSample } from '@/lib/story-templates/catalog';
import spanishDetail from '@/messages/es-ES/SampleBookDetail.json';
import { permanentRedirect } from 'next/navigation';

jest.mock('@/lib/story-templates/catalog', () => ({ getTemplateForSample: jest.fn() }));
jest.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, { has: () => false }),
}));
jest.mock('next-intl/server', () => ({
  getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) => {
    if (locale === 'es-ES' && namespace === 'SampleBookDetail') {
      return (key: 'fictionalTitle' | 'cover', { title }: { title: string }) =>
        spanishDetail.SampleBookDetail[key].replace('{title}', title);
    }
    return () => 'Create similar';
  },
}));
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
  permanentRedirect: jest.fn(() => {
    throw new Error('redirect');
  }),
}));
jest.mock('@/content/sample-books/seo', () => ({ getSeoSampleBook: () => undefined }));
jest.mock('@/lib/seo', () => ({
  buildLocalizedUrl: (locale: string, path = '') => `https://mythoria.pt/${locale}${path}`,
  buildAbsoluteUrl: (path: string) => `https://mythoria.pt${path}`,
}));
jest.mock('@/lib/sample-books/catalog', () => ({
  getSampleBookBySlug: jest.fn(async () => ({
    id: 'mia-pt',
    slug: 'mia-e-a-pastelaria-da-lua',
    title: 'Moon bakery',
    synopsis: 'A fictional premise',
    locale: 'pt-PT',
    intent: 'kids_bedtime',
    recipients: [],
    tags: [],
    style: 'claymation',
    coverSrc: '/cover.jpg',
    source: 'sample-pack',
  })),
  getSampleBookChapter: async () => null,
}));

const request = {
  params: Promise.resolve({ locale: 'pt-PT', slug: 'mia-e-a-pastelaria-da-lua' }),
  searchParams: Promise.resolve({ utm_source: 'newsletter', ref: 'partner', prompt: 'private' }),
};

describe('sample story template entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not offer unmapped stories as templates', async () => {
    jest.mocked(getTemplateForSample).mockReturnValue(undefined);
    render(await SampleBookPage(request));
    expect(screen.queryByRole('link', { name: 'Create similar' })).not.toBeInTheDocument();
  });

  it('uses the approved template and carries safe acquisition context', async () => {
    jest
      .mocked(getTemplateForSample)
      .mockReturnValue({ id: 'moonlight-adventure' } as NonNullable<
        ReturnType<typeof getTemplateForSample>
      >);
    render(await SampleBookPage(request));
    const link = new URL(
      screen.getByRole('link', { name: 'Create similar' }).getAttribute('href')!,
      'https://mythoria.pt',
    );
    expect(link.pathname).toBe('/pt-PT/tell-your-story/step-1');
    expect(Object.fromEntries(link.searchParams)).toEqual({
      templateId: 'moonlight-adventure',
      ref: 'partner',
      utm_source: 'newsletter',
    });
  });

  it('preserves valid campaign query syntax on canonical locale redirects', async () => {
    await expect(
      SampleBookPage({
        ...request,
        params: Promise.resolve({ locale: 'en-US', slug: 'mia-e-a-pastelaria-da-lua' }),
      }),
    ).rejects.toThrow('redirect');
    expect(permanentRedirect).toHaveBeenCalledWith(
      '/pt-PT/sample-books/mia-e-a-pastelaria-da-lua?utm_source=newsletter&ref=partner',
    );
  });

  it('localizes the fictional example title and cover metadata in Spanish', async () => {
    jest.mocked(getSampleBookBySlug).mockResolvedValueOnce({
      id: 'news-es',
      slug: 'la-noticia-a-medias',
      title: 'La noticia a medias',
      synopsis: 'Un misterio en la escuela.',
      locale: 'es-ES',
      intent: 'school_projects',
      recipients: [],
      tags: [],
      style: 'euro_comic_book',
      fictionalUserContext: 'Ejemplo de ficción.',
      coverSrc: '/cover.jpg',
      source: 'sample-pack',
    });
    const meta = await generateMetadata({
      ...request,
      params: Promise.resolve({ locale: 'es-ES', slug: 'la-noticia-a-medias' }),
    });

    expect(meta.title).toBe('La noticia a medias (ejemplo de ficción) | Mythoria');
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://mythoria.pt/cover.jpg', alt: 'Portada de «La noticia a medias»' },
    ]);
    expect(meta.alternates?.canonical).toBe(
      'https://mythoria.pt/es-ES/sample-books/la-noticia-a-medias',
    );
  });
});

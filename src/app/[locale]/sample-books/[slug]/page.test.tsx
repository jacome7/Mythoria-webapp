/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import SampleBookPage from './page';
import { getTemplateForSample } from '@/lib/story-templates/catalog';
import { getStoryTemplateAccess } from '@/lib/story-templates/access';
import { permanentRedirect } from 'next/navigation';

jest.mock('@/lib/story-templates/access', () => ({ getStoryTemplateAccess: jest.fn() }));
jest.mock('@/lib/story-templates/catalog', () => ({ getTemplateForSample: jest.fn() }));
jest.mock('next-intl/server', () => ({ getTranslations: async () => () => 'Create similar' }));
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
  getSampleBookBySlug: async () => ({
    slug: 'mia-e-a-pastelaria-da-lua',
    title: 'Moon bakery',
    synopsis: 'A fictional premise',
    locale: 'pt-PT',
    tags: [],
    coverSrc: '/cover.jpg',
  }),
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

  it('keeps the existing detail page when disabled', async () => {
    jest.mocked(getStoryTemplateAccess).mockResolvedValue(false);
    render(await SampleBookPage(request));
    expect(screen.queryByRole('link', { name: 'Create similar' })).not.toBeInTheDocument();
    expect(getTemplateForSample).not.toHaveBeenCalled();
  });

  it('does not offer unmapped stories as templates', async () => {
    jest.mocked(getStoryTemplateAccess).mockResolvedValue(true);
    jest.mocked(getTemplateForSample).mockReturnValue(undefined);
    render(await SampleBookPage(request));
    expect(screen.queryByRole('link', { name: 'Create similar' })).not.toBeInTheDocument();
  });

  it('uses the approved template and carries safe acquisition context', async () => {
    jest.mocked(getStoryTemplateAccess).mockResolvedValue(true);
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
});

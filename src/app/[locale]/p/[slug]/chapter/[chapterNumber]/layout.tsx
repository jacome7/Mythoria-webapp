import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { storyService } from '@/db/services';
import { buildLocalizedPath, buildLocalizedUrl } from '@/lib/seo';
import { isSearchIndexableStory } from '@/lib/story-seo';
import { normalizeLocale } from '@/utils/locale-utils';

type Params = { locale: string; slug: string; chapterNumber: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const story = await storyService.getPublicStorySeoData(slug);
  if (!story || !isSearchIndexableStory(story)) return { robots: 'noindex,follow' };

  return {
    title: story.title,
    robots: 'noindex,follow',
    alternates: {
      canonical: buildLocalizedUrl(normalizeLocale(story.storyLanguage), `/p/${story.slug}`),
    },
  };
}

export default async function PublicChapterLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<Params> }>) {
  const { locale, slug, chapterNumber } = await params;
  const story = await storyService.getPublicStorySeoData(slug);
  if (!story || !isSearchIndexableStory(story)) notFound();
  const canonicalLocale = normalizeLocale(story.storyLanguage);
  if (locale !== canonicalLocale) {
    permanentRedirect(
      buildLocalizedPath(canonicalLocale, `/p/${story.slug}/chapter/${chapterNumber}`),
    );
  }
  return children;
}

import GetInspiredPageClient, { type FeaturedStory } from './GetInspiredPageClient';
import { storyService } from '@/db/services';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buildLocalizedPath } from '@/lib/seo';
import { normalizeLocale } from '@/utils/locale-utils';

const PUBLIC_STORIES_PER_PAGE = 24;

export default async function GetInspiredPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ publicPage?: string }>;
}) {
  const [{ locale }, query, t, stories, publicStories] = await Promise.all([
    params,
    searchParams,
    params.then(({ locale }) => getTranslations({ locale, namespace: 'GetInspiredPage' })),
    storyService.getFeaturedPublicStories(),
    storyService.getIndexablePublicStoriesForSitemap(),
  ]);
  const initialStories: FeaturedStory[] = stories
    .filter((story): story is typeof story & { slug: string } => Boolean(story.slug?.trim()))
    .map((story) => ({
      storyId: story.storyId,
      title: story.title,
      slug: story.slug,
      featureImageUri: story.featureImageUri,
      author: story.author,
      createdAt: story.createdAt.toISOString(),
      targetAudience: story.targetAudience ?? undefined,
      graphicalStyle: story.graphicalStyle ?? undefined,
      storyLanguage: story.storyLanguage,
      averageRating: story.averageRating,
      ratingCount: story.ratingCount,
    }));

  const requestedPage = Number(query.publicPage || '1');
  const totalPages = Math.max(1, Math.ceil(publicStories.length / PUBLIC_STORIES_PER_PAGE));
  const currentPage = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageStories = publicStories.slice(
    (currentPage - 1) * PUBLIC_STORIES_PER_PAGE,
    currentPage * PUBLIC_STORIES_PER_PAGE,
  );

  return (
    <>
      <GetInspiredPageClient initialStories={initialStories} />
      <section aria-labelledby="public-story-archive-title" className="bg-base-100 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 id="public-story-archive-title" className="text-3xl font-bold text-primary">
            {t('archive.title')}
          </h2>
          <p className="mt-3 text-base-content/70">{t('archive.subtitle')}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageStories.map((story) => (
              <li key={story.storyId} className="rounded-xl border border-base-300 bg-base-100 p-5">
                <Link
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                  href={buildLocalizedPath(
                    normalizeLocale(story.storyLanguage),
                    `/p/${story.slug}`,
                  )}
                >
                  {story.title}
                </Link>
                {story.author ? (
                  <p className="mt-2 text-sm text-base-content/60">
                    {t('archive.createdBy', { author: story.author })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <nav aria-label={t('archive.paginationLabel')} className="mt-8 flex gap-3">
              {currentPage > 1 ? (
                <Link
                  className="btn btn-outline"
                  href={`/${locale}/get-inspired?publicPage=${currentPage - 1}`}
                >
                  {t('archive.previous')}
                </Link>
              ) : null}
              {currentPage < totalPages ? (
                <Link
                  className="btn btn-outline"
                  href={`/${locale}/get-inspired?publicPage=${currentPage + 1}`}
                >
                  {t('archive.next')}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>
    </>
  );
}

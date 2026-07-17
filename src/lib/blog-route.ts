import { blogService, BlogLocale, BlogPostDetail } from '@/db/services/blog';

export type BlogRouteResolution =
  | {
      type: 'resolved';
      post: BlogPostDetail;
      translations: Awaited<ReturnType<typeof blogService.getPublishedTranslationsBySlugBase>>;
    }
  | {
      type: 'redirect';
      locale: BlogLocale;
      slug: string;
    }
  | {
      type: 'notFound';
    };

export async function resolveBlogPostRoute(
  locale: BlogLocale,
  slug: string,
): Promise<BlogRouteResolution> {
  const post = await blogService.getPublishedBySlug(locale, slug);
  if (post) {
    const translations = await blogService.getPublishedTranslationsBySlugBase(post.slugBase);
    return {
      type: 'resolved',
      post,
      translations,
    };
  }

  const matches = await blogService.getPublishedMatchesByAnySlug(slug);
  const slugBases = new Set(matches.map((match) => match.slugBase));
  if (slugBases.size !== 1) {
    return { type: 'notFound' };
  }

  const matchedTranslation = matches[0]!;

  const translations = await blogService.getPublishedTranslationsBySlugBase(
    matchedTranslation.slugBase,
  );
  const requestedLocaleTranslation = translations.find(
    (translation) => translation.locale === locale,
  );

  if (requestedLocaleTranslation) {
    return {
      type: 'redirect',
      locale,
      slug: requestedLocaleTranslation.slug,
    };
  }

  return {
    type: 'redirect',
    locale: matchedTranslation.locale as BlogLocale,
    slug: matchedTranslation.slug,
  };
}

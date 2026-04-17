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

  const matchedTranslation = await blogService.getPublishedByAnySlug(slug);
  if (!matchedTranslation) {
    return { type: 'notFound' };
  }

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

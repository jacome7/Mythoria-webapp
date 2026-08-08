import { blogService, storyService } from '@/db/services';
import { buildLocalizedPath, extractLocalizedPath, normalizePathname } from '@/lib/seo';
import { normalizeLocale } from '@/utils/locale-utils';

export type DynamicSeoResolution =
  | { type: 'canonical'; pathname: string }
  | { type: 'redirect'; pathname: string }
  | { type: 'notFound' }
  | { type: 'unmatched' };

const LEGACY_BLOG_SLUG_ALIASES = new Map([
  ['lerne-das-mythoria-ki-team-kennen', 'meet-mythoria-ai-team'],
  ['rencontrez-l-equipe-ia-de-mythoria', 'meet-mythoria-ai-team'],
]);

export async function resolveDynamicPublicSeoPath(pathname: string): Promise<DynamicSeoResolution> {
  const normalized = normalizePathname(pathname);
  const { locale, pathSuffix } = extractLocalizedPath(normalized);

  const blogMatch = pathSuffix.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) {
    const requestedSlug = blogMatch[1]!;
    const lookupSlug = LEGACY_BLOG_SLUG_ALIASES.get(requestedSlug) ?? requestedSlug;
    const matches = await blogService.getPublishedMatchesByAnySlug(lookupSlug);
    const slugBases = new Set(matches.map((match) => match.slugBase));
    if (slugBases.size !== 1) return { type: 'notFound' };

    const translations = await blogService.getPublishedTranslationsBySlugBase(matches[0]!.slugBase);
    const directMatch = matches.find((match) => match.slug === lookupSlug);
    const target =
      (locale && translations.find((translation) => translation.locale === locale)) ??
      directMatch ??
      translations[0];
    if (!target) return { type: 'notFound' };

    const canonical = buildLocalizedPath(target.locale, `/blog/${target.slug}`);
    return pathname === canonical
      ? { type: 'canonical', pathname: canonical }
      : { type: 'redirect', pathname: canonical };
  }

  const storyMatch = pathSuffix.match(/^\/p\/([^/]+)$/);
  if (storyMatch) {
    const story = await storyService.getPublicStorySeoData(storyMatch[1]!);
    if (!story) return { type: 'notFound' };

    const canonical = buildLocalizedPath(normalizeLocale(story.storyLanguage), `/p/${story.slug}`);
    return pathname === canonical
      ? { type: 'canonical', pathname: canonical }
      : { type: 'redirect', pathname: canonical };
  }

  return { type: 'unmatched' };
}

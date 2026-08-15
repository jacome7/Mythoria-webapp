import { SUPPORTED_LOCALES } from '@/config/locales';

export type SearchIndexableStory = {
  isPublic: boolean | null;
  isFeatured: boolean | null;
  status: string | null;
  slug: string | null;
  title: string | null;
  synopsis: string | null;
  coverUri: string | null;
  storyLanguage: string | null;
  hasMeaningfulContent: boolean;
};

export type SearchIndexableStoryResult = SearchIndexableStory & {
  isPublic: true;
  status: 'published';
  slug: string;
  title: string;
  synopsis: string;
  coverUri: string;
  storyLanguage: string;
  hasMeaningfulContent: true;
};

export const PUBLIC_STORY_VALIDATION_CODES = [
  'not_public',
  'not_published',
  'missing_slug',
  'unstable_slug',
  'unsupported_locale',
  'missing_title',
  'missing_synopsis',
  'missing_cover',
  'missing_meaningful_chapter',
] as const;

export type PublicStoryValidationCode = (typeof PUBLIC_STORY_VALIDATION_CODES)[number];

export type PublicStoryValidationResult =
  { valid: true; missing: [] } | { valid: false; missing: PublicStoryValidationCode[] };

export function isStablePublicStorySlug(slug: string | null | undefined): slug is string {
  if (!slug || slug !== slug.trim() || slug.length > 200) return false;
  if (!slug.startsWith('/') && !/[\\/?#\u0000-\u001f\u007f]/.test(slug)) return true;
  return false;
}

export function validatePublicStoryIndexability(
  story: SearchIndexableStory,
): PublicStoryValidationResult {
  const missing: PublicStoryValidationCode[] = [];
  if (story.isPublic !== true) missing.push('not_public');
  if (story.status !== 'published') missing.push('not_published');
  if (!story.slug?.trim()) missing.push('missing_slug');
  else if (!isStablePublicStorySlug(story.slug)) missing.push('unstable_slug');
  if (!story.storyLanguage || !SUPPORTED_LOCALES.includes(story.storyLanguage)) {
    missing.push('unsupported_locale');
  }
  if (!story.title?.trim()) missing.push('missing_title');
  if (!story.synopsis?.trim()) missing.push('missing_synopsis');
  if (!story.coverUri?.trim()) missing.push('missing_cover');
  if (!story.hasMeaningfulContent) missing.push('missing_meaningful_chapter');
  return missing.length === 0 ? { valid: true, missing: [] } : { valid: false, missing };
}

export function isSearchIndexableStory(
  story: SearchIndexableStory,
): story is SearchIndexableStoryResult {
  return validatePublicStoryIndexability(story).valid;
}

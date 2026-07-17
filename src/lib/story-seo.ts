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

export function isSearchIndexableStory(story: SearchIndexableStory): boolean {
  return Boolean(
    story.isPublic &&
    story.isFeatured &&
    story.status === 'published' &&
    story.slug?.trim() &&
    story.title?.trim() &&
    story.synopsis?.trim() &&
    story.coverUri?.trim() &&
    story.storyLanguage &&
    SUPPORTED_LOCALES.includes(story.storyLanguage) &&
    story.hasMeaningfulContent,
  );
}

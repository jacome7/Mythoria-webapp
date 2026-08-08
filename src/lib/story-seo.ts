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
  isFeatured: true;
  status: 'published';
  slug: string;
  title: string;
  synopsis: string;
  coverUri: string;
  storyLanguage: string;
  hasMeaningfulContent: true;
};

export function isSearchIndexableStory(
  story: SearchIndexableStory,
): story is SearchIndexableStoryResult {
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

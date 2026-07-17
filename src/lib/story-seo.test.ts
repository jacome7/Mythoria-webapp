import { isSearchIndexableStory, type SearchIndexableStory } from './story-seo';

const eligible: SearchIndexableStory = {
  isPublic: true,
  isFeatured: true,
  status: 'published',
  slug: 'moon-garden',
  title: 'Moon Garden',
  synopsis: 'A complete synopsis.',
  coverUri: '/cover.webp',
  storyLanguage: 'en-US',
  hasMeaningfulContent: true,
};

describe('isSearchIndexableStory', () => {
  it('requires every public search-quality invariant', () => {
    expect(isSearchIndexableStory(eligible)).toBe(true);
    for (const key of Object.keys(eligible) as Array<keyof SearchIndexableStory>) {
      expect(isSearchIndexableStory({ ...eligible, [key]: null })).toBe(false);
    }
  });

  it('rejects unsupported locales and unfeatured public stories', () => {
    expect(isSearchIndexableStory({ ...eligible, storyLanguage: 'it-IT' })).toBe(false);
    expect(isSearchIndexableStory({ ...eligible, isFeatured: false })).toBe(false);
  });
});

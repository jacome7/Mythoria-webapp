import {
  isSearchIndexableStory,
  validatePublicStoryIndexability,
  type SearchIndexableStory,
} from './story-seo';

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
    for (const key of Object.keys(eligible).filter(
      (candidate) => candidate !== 'isFeatured',
    ) as Array<keyof SearchIndexableStory>) {
      expect(isSearchIndexableStory({ ...eligible, [key]: null })).toBe(false);
    }
  });

  it('rejects unsupported locales without coupling SEO to merchandising', () => {
    expect(isSearchIndexableStory({ ...eligible, storyLanguage: 'it-IT' })).toBe(false);
    expect(isSearchIndexableStory({ ...eligible, isFeatured: false })).toBe(true);
  });

  it('returns typed validation codes for incomplete public stories', () => {
    expect(
      validatePublicStoryIndexability({
        ...eligible,
        status: 'draft',
        synopsis: ' ',
        hasMeaningfulContent: false,
      }),
    ).toEqual({
      valid: false,
      missing: ['not_published', 'missing_synopsis', 'missing_meaningful_chapter'],
    });
  });
});

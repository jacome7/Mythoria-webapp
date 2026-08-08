import {
  getConfiguredStorageUrl,
  getFeaturedStoryPdfFilename,
  getFeaturedStoryPdfUri,
  hasFeaturedStoryPdfDownloads,
  isPublicStoryPdfDocument,
} from './public-story-pdf';

const eligibleStory = {
  isPublic: true,
  isFeatured: true,
  coverPdfUri: 'https://storage.googleapis.com/mythoria-generated-stories/story/print/cover.pdf',
  interiorPdfUri:
    'https://storage.googleapis.com/mythoria-generated-stories/story/print/interior.pdf',
};

describe('public featured-story PDF helpers', () => {
  it.each([
    ['private', { ...eligibleStory, isPublic: false }],
    ['not featured', { ...eligibleStory, isFeatured: false }],
    ['missing cover', { ...eligibleStory, coverPdfUri: null }],
    ['missing interior', { ...eligibleStory, interiorPdfUri: ' ' }],
  ])('does not enable free downloads for a %s story', (_label, story) => {
    expect(hasFeaturedStoryPdfDownloads(story)).toBe(false);
  });

  it('selects each final PDF only for an eligible featured story', () => {
    expect(hasFeaturedStoryPdfDownloads(eligibleStory)).toBe(true);
    expect(getFeaturedStoryPdfUri(eligibleStory, 'cover')).toContain('cover.pdf');
    expect(getFeaturedStoryPdfUri(eligibleStory, 'interior')).toContain('interior.pdf');
    expect(getFeaturedStoryPdfUri({ ...eligibleStory, isFeatured: false }, 'cover')).toBeNull();
  });

  it('uses safe download filenames and valid document types', () => {
    expect(getFeaturedStoryPdfFilename('A História da Inês!', 'cover')).toBe(
      'a-historia-da-ines-capa.pdf',
    );
    expect(getFeaturedStoryPdfFilename('A História da Inês!', 'interior')).toBe(
      'a-historia-da-ines-livro.pdf',
    );
    expect(isPublicStoryPdfDocument('cover')).toBe(true);
    expect(isPublicStoryPdfDocument('interior')).toBe(true);
    expect(isPublicStoryPdfDocument('book')).toBe(false);
  });

  it('only resolves references from the configured storage bucket', () => {
    expect(
      getConfiguredStorageUrl('gs://mythoria-generated-stories/story/print/cover final.pdf'),
    ).toBe(
      'https://storage.googleapis.com/mythoria-generated-stories/story/print/cover%20final.pdf',
    );
    expect(
      getConfiguredStorageUrl(
        'https://mythoria-generated-stories.storage.googleapis.com/story/print/interior.pdf',
      ),
    ).toBe('https://storage.googleapis.com/mythoria-generated-stories/story/print/interior.pdf');
    expect(getConfiguredStorageUrl('https://example.com/cover.pdf')).toBeNull();
  });
});

import {
  assertSeoMigrationPreflight,
  SEO_TRANSLATION_KEEP_ID,
  SEO_TRANSLATION_REMOVE_ID,
  type SeoTranslationPreflightRow,
} from './seo-migration-guard';

const authored = {
  post_id: '7c4f355b-6e75-4e80-ae2e-422868bdde90',
  locale: 'de-DE',
  slug: 'kleine-laternen-personalisierte-buecher-kindern-beim-aufwachsen',
  title: 'Kleine Laternen',
  summary: 'Identical summary',
  content_mdx: '# Identical content',
};

function row(id: string, overrides = {}): SeoTranslationPreflightRow {
  return { id, ...authored, ...overrides };
}

const validInput = () => ({
  knownRows: [row(SEO_TRANSLATION_KEEP_ID), row(SEO_TRANSLATION_REMOVE_ID)],
  postLocaleDuplicates: [{ count: 2 }],
  localeSlugDuplicates: [{ count: 2 }],
  storySlugDuplicates: [] as Array<{ count: number }>,
});

describe('assertSeoMigrationPreflight', () => {
  it('accepts only the known byte-identical duplicate state', () => {
    expect(() => assertSeoMigrationPreflight(validInput())).not.toThrow();
  });

  it('aborts when authored content differs', () => {
    const input = validInput();
    input.knownRows[1] = row(SEO_TRANSLATION_REMOVE_ID, { content_mdx: '# Changed' });
    expect(() => assertSeoMigrationPreflight(input)).toThrow('authored-content identical');
  });

  it('aborts when any unexpected duplicate exists', () => {
    const input = validInput();
    input.storySlugDuplicates = [{ count: 2 }];
    expect(() => assertSeoMigrationPreflight(input)).toThrow('migration must not run');
  });
});

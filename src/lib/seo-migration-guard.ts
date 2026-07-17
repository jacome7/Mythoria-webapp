export const SEO_TRANSLATION_KEEP_ID = '959981e0-d84c-4061-8382-f3b1979bf114';
export const SEO_TRANSLATION_REMOVE_ID = '67346182-a141-494d-bcd5-f9eedb0ed4d0';

export interface SeoTranslationPreflightRow {
  id: string;
  post_id: string;
  locale: string;
  slug: string;
  title: string;
  summary: string;
  content_mdx: string;
}

interface DuplicateRow {
  count: number;
}

export function assertSeoMigrationPreflight(input: {
  knownRows: SeoTranslationPreflightRow[];
  postLocaleDuplicates: DuplicateRow[];
  localeSlugDuplicates: DuplicateRow[];
  storySlugDuplicates: DuplicateRow[];
}): void {
  const ids = new Set(input.knownRows.map((row) => row.id));
  if (
    input.knownRows.length !== 2 ||
    !ids.has(SEO_TRANSLATION_KEEP_ID) ||
    !ids.has(SEO_TRANSLATION_REMOVE_ID)
  ) {
    throw new Error('Expected duplicate rows are missing');
  }

  const authored = ({ id: _id, ...row }: SeoTranslationPreflightRow) => row;
  if (
    JSON.stringify(authored(input.knownRows[0])) !== JSON.stringify(authored(input.knownRows[1]))
  ) {
    throw new Error('Expected duplicate rows are no longer authored-content identical');
  }

  if (
    input.postLocaleDuplicates.length !== 1 ||
    input.postLocaleDuplicates[0]?.count !== 2 ||
    input.localeSlugDuplicates.length !== 1 ||
    input.localeSlugDuplicates[0]?.count !== 2 ||
    input.storySlugDuplicates.length !== 0
  ) {
    throw new Error('Unexpected SEO uniqueness state; migration must not run');
  }
}

import { config } from 'dotenv';
import { Client } from 'pg';
import {
  assertSeoMigrationPreflight,
  SEO_TRANSLATION_KEEP_ID,
  SEO_TRANSLATION_REMOVE_ID,
  type SeoTranslationPreflightRow,
} from '../src/lib/seo-migration-guard';

config({ path: '.env.local', quiet: true });

const KEEP_ID = SEO_TRANSLATION_KEEP_ID;
const REMOVE_ID = SEO_TRANSLATION_REMOVE_ID;
const postflight = process.argv.includes('--postflight');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: false,
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();

  try {
    const knownRows = await client.query<SeoTranslationPreflightRow>(
      `select id, post_id, locale, slug, title, summary, content_mdx
       from blog_post_translations where id = any($1::uuid[]) order by id`,
      [[KEEP_ID, REMOVE_ID]],
    );
    const postLocaleDuplicates = await client.query(
      `select post_id, locale, count(*)::int as count
       from blog_post_translations group by post_id, locale having count(*) > 1`,
    );
    const localeSlugDuplicates = await client.query(
      `select locale, slug, count(*)::int as count
       from blog_post_translations group by locale, slug having count(*) > 1`,
    );
    const storySlugDuplicates = await client.query(
      `select slug, count(*)::int as count
       from stories where slug is not null group by slug having count(*) > 1`,
    );

    if (postflight) {
      const indexes = await client.query<{ indexname: string }>(
        `select indexname from pg_indexes
         where tablename = 'blog_post_translations'
           and indexname = any($1::text[])
         order by indexname`,
        [
          [
            'blog_post_translations_post_locale_unique',
            'blog_post_translations_locale_slug_unique',
          ],
        ],
      );

      if (
        knownRows.rowCount !== 1 ||
        knownRows.rows[0]?.id !== KEEP_ID ||
        postLocaleDuplicates.rowCount !== 0 ||
        localeSlugDuplicates.rowCount !== 0 ||
        storySlugDuplicates.rowCount !== 0 ||
        indexes.rowCount !== 2
      ) {
        throw new Error('SEO uniqueness migration postflight failed');
      }

      console.log(
        JSON.stringify(
          {
            ok: true,
            retainedId: KEEP_ID,
            removedId: REMOVE_ID,
            postLocaleDuplicates: [],
            localeSlugDuplicates: [],
            storySlugDuplicates: [],
            indexes: indexes.rows.map((row) => row.indexname),
          },
          null,
          2,
        ),
      );
      return;
    }

    assertSeoMigrationPreflight({
      knownRows: knownRows.rows,
      postLocaleDuplicates: postLocaleDuplicates.rows as Array<{ count: number }>,
      localeSlugDuplicates: localeSlugDuplicates.rows as Array<{ count: number }>,
      storySlugDuplicates: storySlugDuplicates.rows as Array<{ count: number }>,
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          keepId: KEEP_ID,
          removeId: REMOVE_ID,
          postLocaleDuplicates: postLocaleDuplicates.rows,
          localeSlugDuplicates: localeSlugDuplicates.rows,
          storySlugDuplicates: storySlugDuplicates.rows,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

DO $$
DECLARE
  keep_row blog_post_translations%ROWTYPE;
  remove_row blog_post_translations%ROWTYPE;
BEGIN
  SELECT * INTO keep_row
  FROM blog_post_translations
  WHERE id = '959981e0-d84c-4061-8382-f3b1979bf114';

  SELECT * INTO remove_row
  FROM blog_post_translations
  WHERE id = '67346182-a141-494d-bcd5-f9eedb0ed4d0';

  IF keep_row.id IS NULL OR remove_row.id IS NULL THEN
    RAISE EXCEPTION 'Expected German duplicate rows are missing; aborting guarded deduplication';
  END IF;

  IF keep_row.post_id IS DISTINCT FROM remove_row.post_id
    OR keep_row.locale IS DISTINCT FROM remove_row.locale
    OR keep_row.slug IS DISTINCT FROM remove_row.slug
    OR keep_row.title IS DISTINCT FROM remove_row.title
    OR keep_row.summary IS DISTINCT FROM remove_row.summary
    OR keep_row.content_mdx IS DISTINCT FROM remove_row.content_mdx THEN
    RAISE EXCEPTION 'Expected German duplicate rows are no longer authored-content identical';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM blog_post_translations
    GROUP BY post_id, locale
    HAVING count(*) > 1
      AND NOT (
        post_id = keep_row.post_id
        AND locale = keep_row.locale
        AND count(*) = 2
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected (post_id, locale) duplicates found; aborting migration';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM blog_post_translations
    GROUP BY locale, slug
    HAVING count(*) > 1
      AND NOT (
        locale = keep_row.locale
        AND slug = keep_row.slug
        AND count(*) = 2
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected (locale, slug) duplicates found; aborting migration';
  END IF;

  DELETE FROM blog_post_translations WHERE id = remove_row.id;

  IF EXISTS (
    SELECT 1 FROM blog_post_translations GROUP BY post_id, locale HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM blog_post_translations GROUP BY locale, slug HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate translations remain after guarded cleanup';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "blog_post_translations_post_locale_unique" ON "blog_post_translations" USING btree ("post_id","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "blog_post_translations_locale_slug_unique" ON "blog_post_translations" USING btree ("locale","slug");

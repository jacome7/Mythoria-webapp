-- 0023_expand_blog_summary.sql
-- Increase blog summary capacity to support richer previews

ALTER TABLE "blog_post_translations"
  ALTER COLUMN "summary" TYPE varchar(1000);

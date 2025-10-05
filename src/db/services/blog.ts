import { db } from '../index';
import { blogPosts, blogPostTranslations } from '../schema/blog';
import { and, asc, desc, eq, lt, gt } from 'drizzle-orm';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/config/locales';

export const BLOG_SUPPORTED_LOCALES = SUPPORTED_LOCALES;
export type BlogLocale = SupportedLocale;

export interface CreatePostInput {
  slugBase: string;
  heroImageUrl?: string | null;
}

export interface UpsertTranslationInput {
  postId: string;
  locale: BlogLocale;
  slug: string; // per-locale slug
  title: string;
  summary: string;
  contentMdx: string;
}

export const blogService = {
  async createPost(input: CreatePostInput) {
    const [existing] = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slugBase, input.slugBase));
    if (existing) throw new Error('slug_base already exists');
    const [post] = await db
      .insert(blogPosts)
      .values({ slugBase: input.slugBase, heroImageUrl: input.heroImageUrl ?? null })
      .returning();
    return post;
  },

  async upsertTranslation(input: UpsertTranslationInput) {
    const [existing] = await db
      .select({ id: blogPostTranslations.id })
      .from(blogPostTranslations)
      .where(
        and(
          eq(blogPostTranslations.postId, input.postId),
          eq(blogPostTranslations.locale, input.locale),
        ),
      );
    if (existing) {
      const [updated] = await db
        .update(blogPostTranslations)
        .set({
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          contentMdx: input.contentMdx,
          updatedAt: new Date(),
        })
        .where(eq(blogPostTranslations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(blogPostTranslations)
        .values({
          postId: input.postId,
          locale: input.locale,
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          contentMdx: input.contentMdx,
        })
        .returning();
      return created;
    }
  },

  async publish(postId: string) {
    const [updated] = await db
      .update(blogPosts)
      .set({ status: 'published', publishedAt: new Date(), updatedAt: new Date() })
      .where(eq(blogPosts.id, postId))
      .returning();
    return updated;
  },

  async archive(postId: string) {
    const [updated] = await db
      .update(blogPosts)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(blogPosts.id, postId))
      .returning();
    return updated;
  },

  async getPublishedList(locale: BlogLocale, opts?: { limit?: number; offset?: number }) {
    const limit = opts?.limit ?? 10;
    const offset = opts?.offset ?? 0;
    const rows = await db
      .select({
        id: blogPosts.id,
        slugBase: blogPosts.slugBase,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        heroImageUrl: blogPosts.heroImageUrl,
        translationId: blogPostTranslations.id,
        slug: blogPostTranslations.slug,
        title: blogPostTranslations.title,
        summary: blogPostTranslations.summary,
        contentMdx: blogPostTranslations.contentMdx,
      })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(and(eq(blogPosts.status, 'published'), eq(blogPostTranslations.locale, locale)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limit)
      .offset(offset);
    return rows;
  },

  async getPublishedBySlug(locale: BlogLocale, slug: string) {
    const [row] = await db
      .select({
        id: blogPosts.id,
        slugBase: blogPosts.slugBase,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        heroImageUrl: blogPosts.heroImageUrl,
        translationId: blogPostTranslations.id,
        slug: blogPostTranslations.slug,
        title: blogPostTranslations.title,
        summary: blogPostTranslations.summary,
        contentMdx: blogPostTranslations.contentMdx,
        locale: blogPostTranslations.locale,
      })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(
        and(
          eq(blogPosts.status, 'published'),
          eq(blogPostTranslations.locale, locale),
          eq(blogPostTranslations.slug, slug),
        ),
      );
    return row || null;
  },

  async getAdjacent(locale: BlogLocale, publishedAt: Date) {
    const [prev] = await db
      .select({
        slug: blogPostTranslations.slug,
        title: blogPostTranslations.title,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(
        and(
          eq(blogPosts.status, 'published'),
          eq(blogPostTranslations.locale, locale),
          lt(blogPosts.publishedAt, publishedAt),
        ),
      )
      .orderBy(desc(blogPosts.publishedAt))
      .limit(1);

    const [next] = await db
      .select({
        slug: blogPostTranslations.slug,
        title: blogPostTranslations.title,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(
        and(
          eq(blogPosts.status, 'published'),
          eq(blogPostTranslations.locale, locale),
          gt(blogPosts.publishedAt, publishedAt),
        ),
      )
      .orderBy(asc(blogPosts.publishedAt))
      .limit(1);

    return { previous: prev || null, next: next || null };
  },

  /**
   * Get all published translations (locale and slug) for a post identified by slugBase.
   */
  async getPublishedTranslationsBySlugBase(slugBase: string) {
    const rows = await db
      .select({
        locale: blogPostTranslations.locale,
        slug: blogPostTranslations.slug,
        publishedAt: blogPosts.publishedAt,
      })
      .from(blogPosts)
      .innerJoin(blogPostTranslations, eq(blogPostTranslations.postId, blogPosts.id))
      .where(and(eq(blogPosts.status, 'published'), eq(blogPosts.slugBase, slugBase)))
      .orderBy(asc(blogPostTranslations.locale));
    return rows;
  },
};

export type BlogListItem = Awaited<ReturnType<typeof blogService.getPublishedList>>[number];
export type BlogPostDetail = NonNullable<
  Awaited<ReturnType<typeof blogService.getPublishedBySlug>>
>;

import { db } from '../index';
import { faqSections, faqEntries } from '../schema';
import { eq, and, asc, sql, or, inArray } from 'drizzle-orm';

export const faqService = {
  /**
   * Get all active FAQ sections with their published entries for a specific locale
   */
  async getFaqData(locale: string, sectionKey?: string, searchQuery?: string) {
    // Fetch active sections
    const whereConditions = [eq(faqSections.isActive, true)];

    if (sectionKey) {
      whereConditions.push(eq(faqSections.sectionKey, sectionKey));
    }

    const activeSections = await db
      .select()
      .from(faqSections)
      .where(and(...whereConditions))
      .orderBy(asc(faqSections.sortOrder));

    if (activeSections.length === 0) {
      return [];
    }

    const sectionIds = activeSections.map((s: any) => s.id);

    // Build WHERE clause for entries
    const entryConditions = [
      eq(faqEntries.locale, locale),
      eq(faqEntries.isPublished, true),
      inArray(faqEntries.sectionId, sectionIds),
    ];

    // Add search condition if provided
    if (searchQuery && searchQuery.trim()) {
      const searchPattern = `%${searchQuery.trim()}%`;
      entryConditions.push(
        or(
          sql`LOWER(${faqEntries.title}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${faqEntries.contentMdx}) LIKE LOWER(${searchPattern})`,
        )!,
      );
    }

    // Fetch published entries for these sections
    const entries = await db
      .select()
      .from(faqEntries)
      .where(and(...entryConditions))
      .orderBy(asc(faqEntries.sectionId), asc(faqEntries.questionSortOrder));

    // Group entries by section
    const sectionsWithEntries = activeSections
      .map((section: any) => ({
        ...section,
        entries: entries.filter((entry) => entry.sectionId === section.id),
      }))
      .filter((section: any) => section.entries.length > 0); // Only include sections with entries

    return sectionsWithEntries;
  },

  /**
   * Get a single FAQ entry by ID (for direct linking)
   */
  async getFaqEntryById(id: string, locale: string) {
    const [entry] = await db
      .select({
        entry: faqEntries,
        section: faqSections,
      })
      .from(faqEntries)
      .innerJoin(faqSections, eq(faqEntries.sectionId, faqSections.id))
      .where(
        and(
          eq(faqEntries.id, id),
          eq(faqEntries.locale, locale),
          eq(faqEntries.isPublished, true),
          eq(faqSections.isActive, true),
        ),
      );

    if (!entry) return null;

    return {
      ...entry.entry,
      section: entry.section,
    };
  },

  /**
   * Search FAQs using PostgreSQL full-text search
   */
  async searchFaqs(locale: string, searchQuery: string) {
    if (!searchQuery.trim()) {
      return [];
    }

    const results = await db
      .select({
        entry: faqEntries,
        section: faqSections,
        rank: sql<number>`ts_rank(to_tsvector('english', ${faqEntries.title} || ' ' || ${faqEntries.contentMdx}), plainto_tsquery('english', ${searchQuery}))`,
      })
      .from(faqEntries)
      .innerJoin(faqSections, eq(faqEntries.sectionId, faqSections.id))
      .where(
        and(
          eq(faqEntries.locale, locale),
          eq(faqEntries.isPublished, true),
          eq(faqSections.isActive, true),
          sql`(to_tsvector('english', ${faqEntries.title} || ' ' || ${faqEntries.contentMdx}) @@ plainto_tsquery('english', ${searchQuery}))`,
        ),
      )
      .orderBy(sql`rank DESC`)
      .limit(50);

    return results.map((r) => ({
      ...r.entry,
      section: r.section,
      relevanceScore: r.rank,
    }));
  },

  /**
   * Get FAQ statistics (for analytics/monitoring)
   */
  async getFaqStats(locale?: string) {
    const localeCondition = locale ? eq(faqEntries.locale, locale) : undefined;

    const [stats] = await db
      .select({
        totalSections: sql<number>`COUNT(DISTINCT ${faqSections.id})`,
        activeSections: sql<number>`SUM(CASE WHEN ${faqSections.isActive} = true THEN 1 ELSE 0 END)`,
        totalEntries: sql<number>`COUNT(${faqEntries.id})`,
        publishedEntries: sql<number>`SUM(CASE WHEN ${faqEntries.isPublished} = true THEN 1 ELSE 0 END)`,
      })
      .from(faqSections)
      .leftJoin(faqEntries, eq(faqSections.id, faqEntries.sectionId))
      .where(localeCondition);

    return stats;
  },
};

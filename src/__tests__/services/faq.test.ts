/** @jest-environment node */
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { faqService } from '@/db/services/faq';
import { faqSections, faqEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

let testDb: ReturnType<typeof drizzle>;
jest.mock('@/db', () => ({
  get db() {
    return testDb;
  },
}));

const connection = process.env.FAQ_TEST_DATABASE_URL;
const suite = connection ? describe : describe.skip;

suite('FAQ Service', () => {
  let pool: Pool;
  let testSectionId: string;
  let testEntryId: string;

  beforeAll(async () => {
    if (!connection) throw new Error('FAQ test database URL is required');
    const url = new URL(connection);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname !== '127.0.0.1' ||
      url.pathname !== '/mythoria_faq_test' ||
      !url.port ||
      url.search ||
      url.hash
    ) {
      throw new Error('FAQ tests require the disposable mythoria_faq_test database on loopback');
    }
    pool = new Pool({ connectionString: url.href, connectionTimeoutMillis: 3000 });
    testDb = drizzle(pool);
    const migration = readFileSync('drizzle/0019_smooth_christian_walker.sql', 'utf8');
    // The first statement changes an unrelated credit event enum.
    const [, ...faqStatements] = migration.split('--> statement-breakpoint');
    for (const statement of faqStatements) {
      await pool.query(statement);
    }
    await pool.query('ALTER TABLE faq_entries DROP COLUMN IF EXISTS summary');

    // Create test section
    const [section] = await testDb
      .insert(faqSections)
      .values({
        sectionKey: 'test-section',
        defaultLabel: 'Test Section',
        iconName: '🧪',
        sortOrder: 999,
        isActive: true,
      })
      .returning();
    testSectionId = section.id;

    // Create test entry
    const [entry] = await testDb
      .insert(faqEntries)
      .values({
        faqKey: 'test-faq',
        locale: 'en-US',
        sectionId: testSectionId,
        title: 'Test Question?',
        contentMdx: '<p>Test answer content</p>',
        questionSortOrder: 1,
        isPublished: true,
      })
      .returning();
    testEntryId = entry.id;
  });

  afterAll(async () => {
    try {
      if (testSectionId) {
        await testDb.delete(faqSections).where(eq(faqSections.id, testSectionId));
      }
    } finally {
      await pool?.end();
    }
  });

  describe('getFaqData', () => {
    it('should return all active sections with published entries', async () => {
      const result = await faqService.getFaqData('en-US');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Should include our test section
      const testSection = result.find((s: any) => s.sectionKey === 'test-section');
      expect(testSection).toBeDefined();
      expect(testSection?.entries).toBeDefined();
      expect(testSection?.entries.length).toBeGreaterThan(0);
    });

    it('should filter by section key', async () => {
      const result = await faqService.getFaqData('en-US', 'test-section');

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].sectionKey).toBe('test-section');
    });

    it('should filter by search query', async () => {
      const result = await faqService.getFaqData('en-US', undefined, 'Test Question');

      expect(result).toBeDefined();
      const testSection = result.find((s: any) => s.sectionKey === 'test-section');
      expect(testSection).toBeDefined();
    });

    it('should return empty array for non-existent locale', async () => {
      const result = await faqService.getFaqData('xx-XX');

      expect(result).toEqual([]);
    });
  });

  describe('getFaqEntryById', () => {
    it('should return entry with section data', async () => {
      const result = await faqService.getFaqEntryById(testEntryId, 'en-US');

      expect(result).toBeDefined();
      expect(result?.id).toBe(testEntryId);
      expect(result?.title).toBe('Test Question?');
      expect(result?.section).toBeDefined();
      expect(result?.section.sectionKey).toBe('test-section');
    });

    it('should return null for non-existent entry', async () => {
      const result = await faqService.getFaqEntryById(
        '00000000-0000-4000-8000-000000000001',
        'en-US',
      );

      expect(result).toBeNull();
    });

    it('should return null for a malformed entry ID', async () => {
      const result = await faqService.getFaqEntryById('non-existent-id', 'en-US');

      expect(result).toBeNull();
    });

    it('should return null for wrong locale', async () => {
      const result = await faqService.getFaqEntryById(testEntryId, 'xx-XX');

      expect(result).toBeNull();
    });
  });

  describe('searchFaqs', () => {
    it('should return ranked search results', async () => {
      const result = await faqService.searchFaqs('en-US', 'Test');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      expect(result[0]?.id).toBe(testEntryId);
      expect(result[0]?.relevanceScore).toBeGreaterThan(0);
    });

    it('should return empty array for empty query', async () => {
      const result = await faqService.searchFaqs('en-US', '');

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should limit results to 50', async () => {
      await testDb.insert(faqEntries).values(
        Array.from({ length: 51 }, (_, index) => ({
          faqKey: `test-catalog-${index}`,
          locale: 'en-US',
          sectionId: testSectionId,
          title: `Catalog question ${index}`,
          contentMdx: 'Catalog test answer',
        })),
      );
      const result = await faqService.searchFaqs('en-US', 'catalog');

      expect(result).toHaveLength(50);
    });
  });

  describe('getFaqStats', () => {
    it('should return statistics for all locales', async () => {
      const result = await faqService.getFaqStats();

      expect(result).toBeDefined();
      expect(result.totalSections).toBeDefined();
      expect(result.activeSections).toBeDefined();
      expect(result.totalEntries).toBeDefined();
      expect(result.publishedEntries).toBeDefined();

      // Should have at least our test data
      expect(Number(result.totalSections)).toBeGreaterThan(0);
      expect(Number(result.totalEntries)).toBeGreaterThan(0);
    });

    it('should return statistics for specific locale', async () => {
      const result = await faqService.getFaqStats('en-US');

      expect(result).toBeDefined();
      expect(Number(result.totalEntries)).toBeGreaterThan(0);
    });
  });
});

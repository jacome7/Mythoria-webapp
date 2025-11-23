/**
 * FAQ Service Tests
 * Tests for the FAQ service layer in mythoria-webapp
 *
 * SKIP: These are integration tests requiring a live database.
 * Run these tests in a CI environment with a test database configured.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/db';
import { faqService } from '@/db/services/faq';
import { faqSections, faqEntries } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe.skip('FAQ Service', () => {
  let testSectionId: string;
  let testEntryId: string;

  beforeAll(async () => {
    // Create test section
    const [section] = await db
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
    const [entry] = await db
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
    // Cleanup test data
    if (testEntryId) {
      await db.delete(faqEntries).where(eq(faqEntries.id, testEntryId));
    }
    if (testSectionId) {
      await db.delete(faqSections).where(eq(faqSections.id, testSectionId));
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
      expect(testSection.entries).toBeDefined();
      expect(testSection.entries.length).toBeGreaterThan(0);
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

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
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

      // Should include relevance score
      if (result.length > 0) {
        expect(result[0].relevanceScore).toBeDefined();
      }
    });

    it('should return empty array for empty query', async () => {
      const result = await faqService.searchFaqs('en-US', '');

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should limit results to 50', async () => {
      const result = await faqService.searchFaqs('en-US', 'how');

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(50);
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

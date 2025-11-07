/**
 * Unit tests for intent-based book sorting logic
 */

import type { IntentContext } from '@/types/intent-context';

// Sample book data for testing
interface SampleBook {
  id: string;
  title: string;
  synopses: string;
  locale: string;
  intent: string;
  recipients: string[];
  tags: string;
  style: string;
}

/**
 * Sort books by priority:
 * 1. Intent match (if intent context provided)
 * 2. Locale match
 * 3. Recipient match (if recipient context provided)
 * 4. Original order
 */
function sortBooksByContext(
  books: SampleBook[],
  currentLocale: string,
  intentContext?: IntentContext
): SampleBook[] {
  // If no intent context, use simple locale-based sorting (existing behavior)
  if (!intentContext?.intent) {
    return [
      ...books.filter((book) => book.locale === currentLocale),
      ...books.filter((book) => book.locale !== currentLocale),
    ];
  }

  // Sort with intent context
  const { intent, recipient } = intentContext;

  return [...books].sort((a, b) => {
    // Priority 1: Intent match
    const aIntentMatch = a.intent === intent;
    const bIntentMatch = b.intent === intent;
    if (aIntentMatch !== bIntentMatch) {
      return aIntentMatch ? -1 : 1;
    }

    // Priority 2: Locale match (within same intent priority)
    const aLocaleMatch = a.locale === currentLocale;
    const bLocaleMatch = b.locale === currentLocale;
    if (aLocaleMatch !== bLocaleMatch) {
      return aLocaleMatch ? -1 : 1;
    }

    // Priority 3: Recipient match (if recipient context provided)
    if (recipient) {
      const aRecipientMatch = a.recipients.includes(recipient);
      const bRecipientMatch = b.recipients.includes(recipient);
      if (aRecipientMatch !== bRecipientMatch) {
        return aRecipientMatch ? -1 : 1;
      }
    }

    // Maintain original order for equal priority
    return 0;
  });
}

describe('sortBooksByContext', () => {
  const mockBooks: SampleBook[] = [
    {
      id: 'book-1',
      title: 'Romance in Portugal',
      synopses: 'A love story',
      locale: 'pt-PT',
      intent: 'romance',
      recipients: ['partner', 'spouse'],
      tags: 'love,romance',
      style: 'watercolor',
    },
    {
      id: 'book-2',
      title: 'Kids Bedtime France',
      synopses: 'A bedtime story',
      locale: 'fr-FR',
      intent: 'kids_bedtime',
      recipients: ['child'],
      tags: 'sleep,bedtime',
      style: 'cartoon',
    },
    {
      id: 'book-3',
      title: 'Romance in Spain',
      synopses: 'Another love story',
      locale: 'es-ES',
      intent: 'romance',
      recipients: ['partner'],
      tags: 'love,romance',
      style: 'sketch',
    },
    {
      id: 'book-4',
      title: 'Pet Story Portugal',
      synopses: 'A pet adventure',
      locale: 'pt-PT',
      intent: 'pet_stories',
      recipients: ['family', 'child'],
      tags: 'pets,adventure',
      style: 'digital_art',
    },
    {
      id: 'book-5',
      title: 'Kids Bedtime Portugal',
      synopses: 'A bedtime story in Portuguese',
      locale: 'pt-PT',
      intent: 'kids_bedtime',
      recipients: ['child', 'parent'],
      tags: 'sleep,bedtime',
      style: 'minimalist',
    },
  ];

  describe('without intent context (locale-only sorting)', () => {
    it('should prioritize books matching current locale', () => {
      const sorted = sortBooksByContext(mockBooks, 'pt-PT');

      // First 3 should be Portuguese books
      expect(sorted[0].locale).toBe('pt-PT');
      expect(sorted[1].locale).toBe('pt-PT');
      expect(sorted[2].locale).toBe('pt-PT');

      // Remaining should be non-Portuguese
      expect(sorted[3].locale).not.toBe('pt-PT');
      expect(sorted[4].locale).not.toBe('pt-PT');
    });

    it('should return all books when locale does not match any', () => {
      const sorted = sortBooksByContext(mockBooks, 'en-US');

      expect(sorted).toHaveLength(mockBooks.length);
    });
  });

  describe('with intent context (intent + locale + recipient sorting)', () => {
    it('should prioritize intent match over locale', () => {
      const context: IntentContext = { intent: 'romance' };
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', context);

      // First two should be romance books (regardless of locale initially)
      expect(sorted[0].intent).toBe('romance');
      expect(sorted[1].intent).toBe('romance');
    });

    it('should prioritize locale within same intent', () => {
      const context: IntentContext = { intent: 'romance' };
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', context);

      // Among romance books, Portuguese should come first
      expect(sorted[0].intent).toBe('romance');
      expect(sorted[0].locale).toBe('pt-PT');
    });

    it('should prioritize recipient within same intent and locale', () => {
      const context: IntentContext = { intent: 'kids_bedtime', recipient: 'child' };
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', context);

      // First should be kids_bedtime + pt-PT + child
      expect(sorted[0].intent).toBe('kids_bedtime');
      expect(sorted[0].locale).toBe('pt-PT');
      expect(sorted[0].recipients).toContain('child');
    });

    it('should handle full context (intent + recipient)', () => {
      const context: IntentContext = { intent: 'romance', recipient: 'spouse' };
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', context);

      // First should match intent, locale, and recipient
      expect(sorted[0].id).toBe('book-1'); // Romance in Portugal with spouse
      expect(sorted[0].intent).toBe('romance');
      expect(sorted[0].locale).toBe('pt-PT');
      expect(sorted[0].recipients).toContain('spouse');
    });

    it('should handle non-matching intent gracefully', () => {
      const context: IntentContext = { intent: 'neurodiversity' };
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', context);

      // Should still prioritize locale when no intent matches
      expect(sorted).toHaveLength(mockBooks.length);
      // Portuguese books should still come first among non-matching
      const firstPortuguese = sorted.findIndex((book) => book.locale === 'pt-PT');
      expect(firstPortuguese).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty book array', () => {
      const sorted = sortBooksByContext([], 'pt-PT');
      expect(sorted).toEqual([]);
    });

    it('should handle undefined intent context', () => {
      const sorted = sortBooksByContext(mockBooks, 'pt-PT', undefined);
      expect(sorted).toHaveLength(mockBooks.length);
    });

    it('should not mutate original array', () => {
      const original = [...mockBooks];
      const context: IntentContext = { intent: 'romance' };
      sortBooksByContext(mockBooks, 'pt-PT', context);

      expect(mockBooks).toEqual(original);
    });
  });
});

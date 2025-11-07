/**
 * Integration tests for intent detection and context flow
 */

import { isValidIntent, normalizeIntent } from '@/constants/intents';
import { isValidRecipient, normalizeRecipient } from '@/constants/recipients';
import type { IntentContext } from '@/types/intent-context';

describe('Intent Detection Flow', () => {
  describe('Intent validation and normalization', () => {
    it('should validate correct intents', () => {
      expect(isValidIntent('romance')).toBe(true);
      expect(isValidIntent('kids_bedtime')).toBe(true);
      expect(isValidIntent('neurodiversity')).toBe(true);
    });

    it('should reject invalid intents', () => {
      expect(isValidIntent('invalid_intent')).toBe(false);
      expect(isValidIntent('ROMANCE')).toBe(false); // case-sensitive
      expect(isValidIntent('')).toBe(false);
    });

    it('should normalize intent strings', () => {
      expect(normalizeIntent('romance')).toBe('romance');
      expect(normalizeIntent('KIDS-BEDTIME')).toBe('kids_bedtime');
      expect(normalizeIntent('Pet Stories')).toBe('pet_stories');
    });
  });

  describe('Recipient validation and normalization', () => {
    it('should validate correct recipients', () => {
      expect(isValidRecipient('partner')).toBe(true);
      expect(isValidRecipient('child')).toBe(true);
      expect(isValidRecipient('family')).toBe(true);
    });

    it('should reject invalid recipients', () => {
      expect(isValidRecipient('invalid_recipient')).toBe(false);
      expect(isValidRecipient('PARTNER')).toBe(false); // case-sensitive
      expect(isValidRecipient('')).toBe(false);
    });

    it('should normalize recipient strings', () => {
      expect(normalizeRecipient('partner')).toBe('partner');
      expect(normalizeRecipient('CHILD')).toBe('child');
      expect(normalizeRecipient('  family  ')).toBe('family');
    });
  });

  describe('Intent context building', () => {
    it('should build context with valid intent only', () => {
      const intent = 'romance';
      const context: IntentContext = {};

      if (isValidIntent(intent)) {
        context.intent = intent;
      }

      expect(context).toEqual({ intent: 'romance' });
    });

    it('should build context with both intent and recipient', () => {
      const intent = 'kids_bedtime';
      const recipient = 'child';
      const context: IntentContext = {};

      if (isValidIntent(intent)) {
        context.intent = intent;
      }
      if (isValidRecipient(recipient)) {
        context.recipient = recipient;
      }

      expect(context).toEqual({ intent: 'kids_bedtime', recipient: 'child' });
    });

    it('should build empty context for invalid values', () => {
      const intent = 'invalid';
      const recipient = 'invalid';
      const context: IntentContext = {};

      if (isValidIntent(intent)) {
        context.intent = intent;
      }
      if (isValidRecipient(recipient)) {
        context.recipient = recipient;
      }

      expect(context).toEqual({});
    });

    it('should include intent but skip invalid recipient', () => {
      const intent = 'romance';
      const recipient = 'invalid';
      const context: IntentContext = {};

      if (isValidIntent(intent)) {
        context.intent = intent;
      }
      if (isValidRecipient(recipient)) {
        context.recipient = recipient;
      }

      expect(context).toEqual({ intent: 'romance' });
    });
  });

  describe('URL patterns', () => {
    it('should handle intent-only URL pattern', () => {
      const urlPattern = '/i/romance';
      const segments = urlPattern.split('/').filter(Boolean);

      expect(segments[0]).toBe('i');
      expect(segments[1]).toBe('romance');
      expect(segments[2]).toBeUndefined();
    });

    it('should handle intent + recipient URL pattern', () => {
      const urlPattern = '/i/kids_bedtime/child';
      const segments = urlPattern.split('/').filter(Boolean);

      expect(segments[0]).toBe('i');
      expect(segments[1]).toBe('kids_bedtime');
      expect(segments[2]).toBe('child');
    });

    it('should handle URL with query parameters', () => {
      const urlPattern = '/i/romance/partner?utm_source=google&utm_campaign=romance';
      const [path, query] = urlPattern.split('?');
      const segments = path.split('/').filter(Boolean);

      expect(segments[1]).toBe('romance');
      expect(segments[2]).toBe('partner');
      expect(query).toContain('utm_source=google');
    });
  });
});

/**
 * Canonical list of story recipients supported by Mythoria
 * This is the single source of truth for recipient validation and routing
 */

export const STORY_RECIPIENTS = [
  'partner',
  'spouse',
  'child',
  'teen',
  'adult',
  'friend',
  'self',
  'family',
  'class',
  'parent',
  'grandparent',
  'team',
  'colleague',
] as const;

export type StoryRecipient = (typeof STORY_RECIPIENTS)[number];

/**
 * Type guard to check if a string is a valid story recipient
 */
export function isValidRecipient(value: unknown): value is StoryRecipient {
  return typeof value === 'string' && STORY_RECIPIENTS.includes(value as StoryRecipient);
}

/**
 * Normalize recipient string to canonical format (lowercase)
 */
export function normalizeRecipient(value: string): string {
  return value.toLowerCase().trim();
}

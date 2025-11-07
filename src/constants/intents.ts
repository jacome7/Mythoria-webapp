/**
 * Canonical list of story intents supported by Mythoria
 * This is the single source of truth for intent validation and routing
 */

export const STORY_INTENTS = [
  'romance',
  'milestones_celebrations',
  'kids_bedtime',
  'kids_adventures',
  'kids_transitions',
  'learning_and_discovery',
  'pet_stories',
  'remembrance',
  'school_projects',
  'sports_teams',
  'family_travels',
  'amusement_parks',
  'neurodiversity',
  'holidays_festivals',
] as const;

export type StoryIntent = (typeof STORY_INTENTS)[number];

/**
 * Type guard to check if a string is a valid story intent
 */
export function isValidIntent(value: unknown): value is StoryIntent {
  return typeof value === 'string' && STORY_INTENTS.includes(value as StoryIntent);
}

/**
 * Normalize intent string to canonical format (lowercase with underscores)
 */
export function normalizeIntent(value: string): string {
  return value.toLowerCase().replace(/[-\s]+/g, '_');
}

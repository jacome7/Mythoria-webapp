export const STORY_TEMPLATE_IDS = [
  'drawing-adventure',
  'moonlight-adventure',
  'pet-mission',
  'magic-doorway',
  'little-love',
  'travel-memories',
  'grandparent-memory',
  'teamwork-day',
] as const;

export type StoryTemplateId = (typeof STORY_TEMPLATE_IDS)[number];

export function isStoryTemplateId(value: unknown): value is StoryTemplateId {
  return typeof value === 'string' && STORY_TEMPLATE_IDS.some((id) => id === value);
}

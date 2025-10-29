// Shared profile option value lists (labels resolved elsewhere / or hardcoded temporarily)
// Keep in sync with onboarding page and DB enums.

export const GENDER_OPTIONS = ['female', 'male', 'prefer_not_to_say'] as const;
export type GenderOption = (typeof GENDER_OPTIONS)[number];

export const LITERARY_AGE_OPTIONS = [
  'teen',
  'emerging_adult',
  'experienced_adult',
  'midlife_mentor_or_elder',
] as const;
export type LiteraryAgeOption = (typeof LITERARY_AGE_OPTIONS)[number];

// For future reuse you can export other option arrays here (goals, audiences, interests) if needed.

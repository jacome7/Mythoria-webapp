import type {
  AudienceCondition,
  AudienceFact,
  SurveyDefinition,
} from '@/lib/surveys/definition-schema';

/** Facts about the invited author, read from the invitation's frozen cohort snapshot. */
export type AudienceFacts = Partial<Record<AudienceFact, number | boolean>>;

/** Pure, shared by the server loader and unit tests. */
export function factsFromSnapshot(snapshot: unknown): AudienceFacts {
  const raw = (snapshot ?? {}) as Record<string, unknown>;
  const facts: AudienceFacts = {};
  if (typeof raw.publishedStoryCount === 'number') {
    facts.publishedStoryCount = raw.publishedStoryCount;
  }
  if (typeof raw.usedPaidService === 'boolean') facts.usedPaidService = raw.usedPaidService;
  if (typeof raw.startedStory === 'boolean') facts.startedStory = raw.startedStory;
  return facts;
}

function matches(condition: AudienceCondition, facts: AudienceFacts): boolean {
  const actual = facts[condition.fact];
  if (condition.operator === 'missing') return actual === undefined;
  if (actual === undefined || condition.value === undefined) return false;
  if (condition.operator === 'equals') return actual === condition.value;
  if (typeof actual !== 'number' || typeof condition.value !== 'number') return false;
  return condition.operator === 'gte' ? actual >= condition.value : actual <= condition.value;
}

export function matchesAudience(
  audience: readonly AudienceCondition[] | undefined,
  facts: AudienceFacts,
): boolean {
  return !audience || audience.every((condition) => matches(condition, facts));
}

/**
 * Remove the questions whose audience does not match. Returns the same object when nothing is
 * restricted, so definitions without `audience` are untouched (and unaffected in the engine's
 * per-definition caches).
 */
export function applyAudience(def: SurveyDefinition, facts: AudienceFacts): SurveyDefinition {
  if (!def.questions.some((question) => question.audience)) return def;
  return {
    ...def,
    questions: def.questions.filter((question) => matchesAudience(question.audience, facts)),
  };
}

import { createHash } from 'node:crypto';

/**
 * Survey cohort classification (see docs/SURVEYS.md "Cohorts").
 *
 * Kept pure so the same rules can be tested without a database. The SQL used by
 * `src/db/services/survey-studies.ts` mirrors these rules and must stay in sync.
 */

export const SURVEY_COHORT_KEYS = ['C1', 'C2', 'C3'] as const;
export type SurveyCohortKey = (typeof SURVEY_COHORT_KEYS)[number];

export const SURVEY_UNCLASSIFIED_KEYS = ['U1', 'U2'] as const;
export type SurveyUnclassifiedKey = (typeof SURVEY_UNCLASSIFIED_KEYS)[number];

export type AuthorClass = SurveyCohortKey | SurveyUnclassifiedKey;

/** Default survey definition id for each invited cohort. */
export const COHORT_SURVEY_IDS: Readonly<Record<SurveyCohortKey, string>> = Object.freeze({
  C1: 'activation_no_story',
  C2: 'free_creator_no_purchase',
  C3: 'paying_creator',
});

export function isSurveyCohortKey(value: string): value is SurveyCohortKey {
  return (SURVEY_COHORT_KEYS as readonly string[]).includes(value);
}

export interface AuthorCohortInput {
  publishedStoryCount: number;
  hasPaidPurchase: boolean;
}

/**
 * - C1: no published story, never paid
 * - C2: exactly one published story, never paid
 * - C3: at least one published story and paid
 * - U1: two or more published stories, never paid (excluded)
 * - U2: paid but no published story (excluded)
 */
export function classifyAuthor({
  publishedStoryCount,
  hasPaidPurchase,
}: AuthorCohortInput): AuthorClass {
  if (hasPaidPurchase) return publishedStoryCount >= 1 ? 'C3' : 'U2';
  if (publishedStoryCount <= 0) return 'C1';
  return publishedStoryCount === 1 ? 'C2' : 'U1';
}

/**
 * Deterministic holdout assignment: first 4 bytes (big-endian uint32) of
 * sha256(studyId + authorId) modulo 100 must be below `percent`.
 *
 * Identical to the SQL expression used when snapshotting audiences:
 * `('x' || substr(encode(sha256(convert_to(study_id::text || author_id::text,'UTF8')),'hex'),1,8))::bit(32)::bigint % 100 < percent`
 * (uuid::text is always lowercase, so ids are lowercased here).
 */
export function holdoutBucket(studyId: string, authorId: string): number {
  const digest = createHash('sha256')
    .update(`${studyId.toLowerCase()}${authorId.toLowerCase()}`, 'utf8')
    .digest();
  return digest.readUInt32BE(0) % 100;
}

export function isHoldout(studyId: string, authorId: string, percent: number): boolean {
  if (!(percent > 0)) return false;
  return holdoutBucket(studyId, authorId) < percent;
}

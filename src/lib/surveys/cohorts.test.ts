import { createHash } from 'node:crypto';
import {
  COHORT_SURVEY_IDS,
  classifyAuthor,
  holdoutBucket,
  isHoldout,
  isSurveyCohortKey,
} from './cohorts';

describe('classifyAuthor', () => {
  it.each([
    [0, false, 'C1'],
    [1, false, 'C2'],
    [2, false, 'U1'],
    [7, false, 'U1'],
    [0, true, 'U2'],
    [1, true, 'C3'],
    [5, true, 'C3'],
  ])('published=%i paid=%s -> %s', (publishedStoryCount, hasPaidPurchase, expected) => {
    expect(classifyAuthor({ publishedStoryCount, hasPaidPurchase })).toBe(expected);
  });

  it('maps every invited cohort to a survey id', () => {
    expect(COHORT_SURVEY_IDS).toEqual({
      C1: 'activation_no_story',
      C2: 'free_creator_no_purchase',
      C3: 'paying_creator',
    });
    expect(isSurveyCohortKey('C2')).toBe(true);
    expect(isSurveyCohortKey('U1')).toBe(false);
  });
});

describe('holdout assignment', () => {
  const studyId = '11111111-1111-4111-8111-111111111111';

  // Mirrors the SQL: first 8 hex chars of sha256(study_id::text || author_id::text) as uint32 % 100.
  function sqlMirror(study: string, author: string) {
    const hex = createHash('sha256').update(`${study}${author}`).digest('hex').slice(0, 8);
    return Number(BigInt(`0x${hex}`) % BigInt(100));
  }

  it('matches the SQL formulation for several vectors', () => {
    const authors = [
      '00000000-0000-4000-8000-000000000001',
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    ];
    for (const author of authors) {
      expect(holdoutBucket(studyId, author)).toBe(sqlMirror(studyId, author));
      expect(holdoutBucket(studyId, author.toUpperCase())).toBe(sqlMirror(studyId, author));
    }
  });

  it('hardcoded vectors', () => {
    expect(holdoutBucket(studyId, '00000000-0000-4000-8000-000000000001')).toBe(74);
    expect(holdoutBucket(studyId, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(33);
    expect(holdoutBucket(studyId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(28);
    expect(isHoldout(studyId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 29)).toBe(true);
    expect(isHoldout(studyId, 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 28)).toBe(false);
  });

  it('is deterministic and respects the percent bounds', () => {
    const author = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    expect(isHoldout(studyId, author, 0)).toBe(false);
    expect(isHoldout(studyId, author, 100)).toBe(true);
    const bucket = holdoutBucket(studyId, author);
    expect(isHoldout(studyId, author, bucket)).toBe(false);
    expect(isHoldout(studyId, author, bucket + 1)).toBe(true);
    expect(isHoldout(studyId, author, 10)).toBe(isHoldout(studyId, author, 10));
  });

  it('assigns roughly the configured share', () => {
    let held = 0;
    const total = 4000;
    for (let i = 0; i < total; i += 1) {
      const author = `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
      if (isHoldout(studyId, author, 10)) held += 1;
    }
    expect(held / total).toBeGreaterThan(0.07);
    expect(held / total).toBeLessThan(0.13);
  });
});

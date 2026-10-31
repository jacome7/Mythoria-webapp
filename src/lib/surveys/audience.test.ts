import { applyAudience, factsFromSnapshot, matchesAudience } from './audience';
import type { SurveyDefinition } from './definition-schema';
import { activationNoStoryV2 } from '@/surveys/definitions/activation_no_story.v2';
import { payingCreatorV3 } from '@/surveys/definitions/paying_creator.v3';

const def = payingCreatorV3 as unknown as SurveyDefinition;
const ids = (d: SurveyDefinition) => d.questions.map((q) => q.id);

describe('survey audience', () => {
  it('reads facts from a snapshot and ignores malformed values', () => {
    expect(
      factsFromSnapshot({ publishedStoryCount: 2, usedPaidService: true, hasPaidPurchase: true }),
    ).toEqual({ publishedStoryCount: 2, usedPaidService: true });
    expect(factsFromSnapshot({ publishedStoryCount: '2' })).toEqual({});
    expect(factsFromSnapshot(null)).toEqual({});
  });

  it('never matches a fact that is missing from an older snapshot', () => {
    expect(
      matchesAudience([{ fact: 'usedPaidService', operator: 'equals', value: true }], {}),
    ).toBe(false);
    expect(matchesAudience(undefined, {})).toBe(true);
  });

  it('C3 v3: one story, used a paid service', () => {
    const result = applyAudience(def, { publishedStoryCount: 1, usedPaidService: true });
    expect(ids(result)).toContain('C04');
    expect(ids(result)).toContain('C05');
    expect(ids(result)).not.toContain('C05B');
    expect(ids(result)).toContain('C07');
  });

  it('C3 v3: several stories, no paid service used', () => {
    const result = applyAudience(def, { publishedStoryCount: 3, usedPaidService: false });
    expect(ids(result)).not.toContain('C04');
    expect(ids(result)).not.toContain('C05');
    expect(ids(result)).toContain('C05B');
    expect(ids(result)).toContain('C07');
  });

  it('C3 v3: no completed story hides the repeat-creation and deterrent questions', () => {
    const result = applyAudience(def, { publishedStoryCount: 0, usedPaidService: false });
    expect(ids(result)).not.toContain('C05');
    expect(ids(result)).not.toContain('C05B');
    expect(ids(result)).not.toContain('C07');
  });

  it('returns the same object for definitions without audiences', () => {
    const plain = { ...def, questions: def.questions.filter((q) => !q.audience) };
    expect(applyAudience(plain, {})).toBe(plain);
  });

  describe('C1 v2 creation-stage variants', () => {
    const c1 = activationNoStoryV2 as unknown as SurveyDefinition;
    const q2 = (facts: Parameters<typeof applyAudience>[1]) =>
      ids(applyAudience(c1, facts)).filter((id) => id.startsWith('A02'));

    it('shows exactly one Q2 variant', () => {
      expect(q2({ startedStory: true })).toEqual(['A02A']);
      expect(q2({ startedStory: false })).toEqual(['A02B']);
      expect(q2({})).toEqual(['A02C']);
    });
  });
});

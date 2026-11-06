import { applyAudience } from '@/lib/surveys/audience';
import type { SurveyDefinition } from '@/lib/surveys/definition-schema';
import { validateSurveyDefinition } from '@/lib/surveys/validate-definition';
import { SURVEY_DEFINITIONS } from './index';
import { payingCreatorV4 } from './paying_creator.v4';
import { payingCreatorV5 } from './paying_creator.v5';
import { activationNoStoryV2 } from './activation_no_story.v2';

type Q = Record<string, unknown> & {
  id: string;
  type: string;
  options?: Array<Record<string, unknown> & { id: string; label?: Record<string, string> }>;
};

const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];
const v4Questions = payingCreatorV4.questions as unknown as Q[];
const v5Questions = payingCreatorV5.questions as unknown as Q[];
const byId = (questions: Q[], id: string) => questions.find((q) => q.id === id)!;
const optionById = (question: Q, id: string) => question.options!.find((o) => o.id === id)!;
const visibleIds = (facts: Parameters<typeof applyAudience>[1]) =>
  applyAudience(payingCreatorV5 as unknown as SurveyDefinition, facts).questions.map((q) => q.id);

const MULTI_IDS = ['C01', 'C05B', 'C07', 'C08', 'C10'];
const EXCLUSIVE_NOTHING_IDS = ['C07', 'C08', 'C10'];

describe('paying_creator v5', () => {
  it('is registered next to v1-v4 and validates against the schema', () => {
    const versions = SURVEY_DEFINITIONS.filter((d) => d.id === 'paying_creator').map(
      (d) => d.version,
    );
    expect(versions).toEqual([1, 2, 3, 4, 5]);
    expect(payingCreatorV5.id).toBe('paying_creator');
    expect(payingCreatorV5.version).toBe(5);
    const result = validateSurveyDefinition(payingCreatorV5);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('adds only C05Z, right after C05B, and keeps every other question in v4 order', () => {
    const ids = v5Questions.map((q) => q.id);
    expect(ids.filter((id) => id !== 'C05Z')).toEqual(v4Questions.map((q) => q.id));
    expect(ids.indexOf('C05Z')).toBe(ids.indexOf('C05B') + 1);
  });

  it('leaves every v4 question deep-equal in v5', () => {
    for (const q4 of v4Questions) {
      expect(byId(v5Questions, q4.id)).toEqual(q4);
    }
  });

  it('keeps definition-level fields identical to v4 apart from the version and questions', () => {
    const { version: _v4, questions: _q4, ...rest4 } = payingCreatorV4;
    const { version: _v5, questions: _q5, ...rest5 } = payingCreatorV5;
    expect(rest5).toEqual(rest4);
  });

  describe('C05Z', () => {
    const c05z = byId(v5Questions, 'C05Z');

    it('is a required single_choice shown only when no story is published', () => {
      expect(c05z.type).toBe('single_choice');
      expect(c05z.required).toBe(true);
      expect(c05z.audience).toEqual([
        { fact: 'publishedStoryCount', operator: 'equals', value: 0 },
      ]);
    });

    it('uses the C1 activation_barrier dimension', () => {
      expect(c05z.dimension).toBe('activation_barrier');
      const c1 = activationNoStoryV2.questions as unknown as Q[];
      expect(byId(c1, 'A02A').dimension).toBe(c05z.dimension);
    });

    it('has the expected option ids, with only "other" taking free text', () => {
      expect(c05z.options!.map((o) => o.id)).toEqual([
        'no_idea',
        'no_occasion',
        'effort',
        'unclear_start',
        'technical_issue',
        'credits_unsure',
        'other',
      ]);
      expect(optionById(c05z, 'other').allowOtherText).toBe(true);
      expect(c05z.options!.filter((o) => o.exclusive)).toEqual([]);
    });

    it('reuses the C1 question label and option wording verbatim', () => {
      const c1 = activationNoStoryV2.questions as unknown as Q[];
      expect(c05z.label).toEqual(byId(c1, 'A02A').label);
      expect(c05z.label).toEqual(byId(c1, 'A02B').label);
      expect(optionById(c05z, 'no_idea').label).toEqual(
        optionById(byId(c1, 'A02A'), 'no_idea').label,
      );
      expect(optionById(c05z, 'technical_issue').label).toEqual(
        optionById(byId(c1, 'A02A'), 'technical_issue').label,
      );
      expect(optionById(c05z, 'unclear_start').label).toEqual(
        optionById(byId(c1, 'A02B'), 'unclear_start').label,
      );
      const c05b = byId(v5Questions, 'C05B');
      for (const id of ['no_occasion', 'effort']) {
        expect(optionById(c05z, id).label).toEqual(optionById(c05b, id).label);
      }
    });

    it('has all five locales for the label and every option, none mentioning "another story"', () => {
      const texts = [c05z.label as Record<string, string>, ...c05z.options!.map((o) => o.label!)];
      for (const text of texts) {
        for (const locale of LOCALES) {
          expect(typeof text[locale]).toBe('string');
          expect(text[locale].trim().length).toBeGreaterThan(0);
        }
        expect(text['en-US'].toLowerCase()).not.toContain('another');
        expect(text['en-US'].toLowerCase()).not.toContain('again');
      }
    });

    it('words the new credits option in en-US', () => {
      expect(optionById(c05z, 'credits_unsure').label!['en-US']).toBe(
        "I'm not sure what I can do with my credits.",
      );
    });
  });

  describe('audience visibility', () => {
    it('shows C05Z, and not C05, C05B or C07, to a buyer with no published story', () => {
      const ids = visibleIds({ publishedStoryCount: 0, usedPaidService: false });
      expect(ids).toContain('C05Z');
      expect(ids).not.toContain('C05');
      expect(ids).not.toContain('C05B');
      expect(ids).not.toContain('C07');
    });

    it('does not show C05Z to a buyer with one published story', () => {
      const ids = visibleIds({ publishedStoryCount: 1, usedPaidService: true });
      expect(ids).not.toContain('C05Z');
      expect(ids).toContain('C05');
      expect(ids).not.toContain('C05B');
      expect(ids).toContain('C07');
    });

    it('does not show C05Z to a buyer with five published stories', () => {
      const ids = visibleIds({ publishedStoryCount: 5, usedPaidService: true });
      expect(ids).not.toContain('C05Z');
      expect(ids).not.toContain('C05');
      expect(ids).toContain('C05B');
      expect(ids).toContain('C07');
    });

    it('does not show C05Z when the story count is missing from an old snapshot', () => {
      expect(visibleIds({})).not.toContain('C05Z');
    });
  });

  describe.each([
    ['v4', payingCreatorV4],
    ['v5', payingCreatorV5],
  ])('multi-answer rules (%s)', (_name, def) => {
    const questions = def.questions as unknown as Q[];

    it.each(MULTI_IDS)('%s is multi_choice without help text', (id) => {
      expect(byId(questions, id).type).toBe('multi_choice');
      expect(byId(questions, id).help).toBeUndefined();
    });

    it.each(EXCLUSIVE_NOTHING_IDS)('%s "nothing" option is exclusive', (id) => {
      expect(optionById(byId(questions, id), 'nothing').exclusive).toBe(true);
    });

    it('marks no other option exclusive and keeps "other" combinable', () => {
      const exclusive = questions.flatMap((q) =>
        (q.options ?? []).filter((o) => o.exclusive).map((o) => `${q.id}.${o.id}`),
      );
      expect(exclusive).toEqual(['C07.nothing', 'C08.nothing', 'C10.nothing']);
      const other = optionById(byId(questions, 'C01'), 'other');
      expect(other.allowOtherText).toBe(true);
      expect(other.exclusive).toBeUndefined();
    });

    it('keeps C03, C05 and C09 single-answer', () => {
      for (const id of ['C03', 'C05', 'C09']) {
        expect(byId(questions, id).type).toBe('single_choice');
      }
    });
  });
});

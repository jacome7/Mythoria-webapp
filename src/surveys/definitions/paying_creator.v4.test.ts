import { validateSurveyDefinition } from '@/lib/surveys/validate-definition';
import { SURVEY_DEFINITIONS } from './index';
import { payingCreatorV3 } from './paying_creator.v3';
import { payingCreatorV4 } from './paying_creator.v4';

type Q = Record<string, unknown> & {
  id: string;
  type: string;
  options?: Array<Record<string, unknown> & { id: string }>;
};

const v3Questions = payingCreatorV3.questions as unknown as Q[];
const v4Questions = payingCreatorV4.questions as unknown as Q[];
const byId = (questions: Q[], id: string) => questions.find((q) => q.id === id)!;

const MULTI_IDS = ['C01', 'C05B', 'C07', 'C08', 'C10'];
const EXCLUSIVE_NOTHING_IDS = ['C07', 'C08', 'C10'];

describe('paying_creator v4', () => {
  it('is registered next to v1-v3 and validates against the schema', () => {
    const versions = SURVEY_DEFINITIONS.filter((d) => d.id === 'paying_creator').map(
      (d) => d.version,
    );
    expect(versions.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(payingCreatorV4.id).toBe('paying_creator');
    expect(payingCreatorV4.version).toBe(4);
    const result = validateSurveyDefinition(payingCreatorV4);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it.each(MULTI_IDS)('%s is multi_choice in v4 and single_choice in v3', (id) => {
    expect(byId(v3Questions, id).type).toBe('single_choice');
    expect(byId(v4Questions, id).type).toBe('multi_choice');
  });

  it.each(MULTI_IDS)(
    '%s has no help text (the renderer adds its own "Choose all that apply" hint)',
    (id) => {
      expect(byId(v4Questions, id).help).toBeUndefined();
    },
  );

  it.each(EXCLUSIVE_NOTHING_IDS)('%s "nothing" option is exclusive', (id) => {
    const nothing = byId(v4Questions, id).options!.find((o) => o.id === 'nothing');
    expect(nothing?.exclusive).toBe(true);
  });

  it('marks no other option exclusive and keeps "other" combinable', () => {
    const exclusive = v4Questions.flatMap((q) =>
      (q.options ?? []).filter((o) => o.exclusive).map((o) => `${q.id}.${o.id}`),
    );
    expect(exclusive).toEqual(['C07.nothing', 'C08.nothing', 'C10.nothing']);
    const other = byId(v4Questions, 'C01').options!.find((o) => o.id === 'other');
    expect(other?.allowOtherText).toBe(true);
    expect(other?.exclusive).toBeUndefined();
  });

  it('keeps the same questions, order and option ids as v3', () => {
    expect(v4Questions.map((q) => q.id)).toEqual(v3Questions.map((q) => q.id));
    for (const q3 of v3Questions) {
      const q4 = byId(v4Questions, q3.id);
      expect((q4.options ?? []).map((o) => o.id)).toEqual((q3.options ?? []).map((o) => o.id));
    }
  });

  it('leaves every other question deep-equal to v3', () => {
    for (const q3 of v3Questions.filter((q) => !MULTI_IDS.includes(q.id))) {
      expect(byId(v4Questions, q3.id)).toEqual(q3);
    }
  });

  it('only changes type, help (removed) and exclusive on the five multi-answer questions', () => {
    for (const id of MULTI_IDS) {
      const { type: _t3, help: _h3, options: options3, ...rest3 } = byId(v3Questions, id);
      const { type: _t4, help: _h4, options: options4, ...rest4 } = byId(v4Questions, id);
      expect(rest4).toEqual(rest3);
      const stripExclusive = (options: Q['options']) =>
        options!.map(({ exclusive: _exclusive, ...option }) => option);
      expect(stripExclusive(options4)).toEqual(stripExclusive(options3));
    }
  });

  it('keeps definition-level fields identical to v3 apart from the version', () => {
    const { version: _v3, questions: _q3, ...rest3 } = payingCreatorV3;
    const { version: _v4, questions: _q4, ...rest4 } = payingCreatorV4;
    expect(rest4).toEqual(rest3);
  });

  it('keeps C05 (one-story wording), C09 and C03 single-answer', () => {
    for (const id of ['C03', 'C05', 'C09']) {
      expect(byId(v4Questions, id).type).toBe('single_choice');
    }
  });
});

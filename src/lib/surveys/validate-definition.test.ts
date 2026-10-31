import type { LocalizedText, SurveyDefinitionInput } from './definition-schema';
import { assertValidSurveyDefinition, validateSurveyDefinition } from './validate-definition';

const t = (label: string): LocalizedText => ({
  'en-US': label,
  'pt-PT': label,
  'es-ES': label,
  'fr-FR': label,
  'de-DE': label,
});

const opts = (...ids: string[]) => ids.map((id) => ({ id, label: t(id) }));

type Q = Record<string, unknown>;

const base = (id: string, extra: Q = {}): Q => ({
  id,
  label: t(id),
  dimension: 'dim',
  required: false,
  ...extra,
});

function def(questions: Q[], extra: Q = {}): SurveyDefinitionInput {
  return {
    schemaVersion: 1,
    id: 'test_survey',
    version: 1,
    purpose: 'Testing',
    title: t('Title'),
    description: t('Description'),
    completionMessage: t('Thanks'),
    estimatedMinutes: 2,
    responsePolicy: { identity: 'invitation' },
    questions,
    ...extra,
  } as unknown as SurveyDefinitionInput;
}

function errorsOf(questions: Q[], extra: Q = {}): string[] {
  const result = validateSurveyDefinition(def(questions, extra));
  return result.ok ? [] : result.errors;
}

const single = (id = 'q1', extra: Q = {}) =>
  base(id, { type: 'single_choice', options: opts('a', 'b', 'c'), ...extra });
const multi = (id = 'm1', extra: Q = {}) =>
  base(id, { type: 'multi_choice', options: opts('a', 'b', 'c'), ...extra });
const num = (id = 'n1', extra: Q = {}) =>
  base(id, { type: 'number', validation: { min: 0, max: 10 }, ...extra });

describe('validateSurveyDefinition', () => {
  it('accepts a valid definition covering all 11 control types', () => {
    const questions: Q[] = [
      base('q_single', { type: 'single_choice', options: opts('a', 'b', 'c') }),
      base('q_multi', {
        type: 'multi_choice',
        options: [
          ...opts('a', 'b'),
          { id: 'none', label: t('None'), exclusive: true },
          { id: 'other', label: t('Other'), allowOtherText: true },
        ],
        validation: { minSelected: 1, maxSelected: 3 },
      }),
      base('q_buttons', { type: 'buttons', selection: 'multiple', options: opts('a', 'b') }),
      base('q_short', { type: 'short_text', validation: { minLength: 1, maxLength: 50 } }),
      base('q_long', { type: 'long_text', validation: { maxLength: 500 } }),
      base('q_number', { type: 'number', validation: { min: 0, max: 10, step: 1 } }),
      base('q_slider', {
        type: 'slider',
        validation: { min: 0, max: 10, step: 1 },
        minLabel: t('Low'),
        maxLabel: t('High'),
        naOptions: [{ id: 'unsure', label: t('Unsure'), notApplicable: true }],
      }),
      base('q_stars', {
        type: 'stars',
        options: [
          { id: 's1', label: t('1'), value: 1 },
          { id: 's2', label: t('2'), value: 2 },
          { id: 'na', label: t('NA'), notApplicable: true },
        ],
      }),
      base('q_smileys', {
        type: 'smileys',
        options: [
          { id: 'bad', label: t('Bad'), value: 1 },
          { id: 'good', label: t('Good'), value: 2 },
        ],
      }),
      base('q_select', { type: 'select', options: opts('x', 'y') }),
      {
        id: 'q_static',
        type: 'static_content',
        label: t('Static'),
        screen: 'extra',
        visibleWhen: { question: 'q_single', operator: 'equals', value: 'a' },
      },
      base('q_cond', {
        type: 'short_text',
        screen: 'extra',
        visibleWhen: {
          all: [
            { question: 'q_single', operator: 'in', value: ['a', 'b'] },
            { question: 'q_multi', operator: 'contains', value: 'a' },
            { question: 'q_number', operator: 'gte', value: 3 },
            { question: 'q_stars', operator: 'lt', value: 3 },
            { question: 'q_slider', operator: 'answered' },
          ],
        },
      }),
    ];
    const result = validateSurveyDefinition(def(questions));
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    const types = result.ok ? new Set(result.definition.questions.map((q) => q.type)) : new Set();
    expect(types.size).toBe(11);
  });

  it('formats zod issues as path: message', () => {
    const result = validateSurveyDefinition({ nope: true });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.every((e) => /^.+: .+/.test(e))).toBe(true);
    }
  });

  it('rejects missing locales through the schema', () => {
    const q = single('q1', { label: { 'en-US': 'Only English' } });
    expect(errorsOf([q]).length).toBeGreaterThan(0);
  });

  it('rejects duplicate question ids', () => {
    expect(errorsOf([single('q1'), single('q1')])).toContain('q1: duplicate question id');
  });

  it('rejects duplicate option ids within a question', () => {
    const q = base('q1', { type: 'single_choice', options: opts('a', 'a') });
    expect(errorsOf([q]).join('\n')).toMatch(/q1: duplicate option id "a"/);
  });

  it('rejects duplicate slider naOption ids', () => {
    const q = base('q1', {
      type: 'slider',
      validation: { min: 0, max: 10 },
      minLabel: t('a'),
      maxLabel: t('b'),
      naOptions: [
        { id: 'x', label: t('x'), notApplicable: true },
        { id: 'x', label: t('x'), notApplicable: true },
      ],
    });
    expect(errorsOf([q]).join('\n')).toMatch(/q1: duplicate option id "x"/);
  });

  describe('visibleWhen references', () => {
    it('rejects forward references', () => {
      const q2 = single('q2', { visibleWhen: { question: 'q3', operator: 'answered' } });
      expect(errorsOf([q2, single('q3')]).join('\n')).toMatch(/q2:.*appears later/);
    });

    it('rejects self references', () => {
      const q = single('q1', { visibleWhen: { question: 'q1', operator: 'answered' } });
      expect(errorsOf([q]).join('\n')).toMatch(/q1:.*reference itself/);
    });

    it('rejects unknown references', () => {
      const q = single('q1', { visibleWhen: { question: 'zzz', operator: 'answered' } });
      expect(errorsOf([q]).join('\n')).toMatch(/q1:.*unknown question "zzz"/);
    });

    it('rejects references to static_content', () => {
      const s = { id: 's1', type: 'static_content', label: t('s') };
      const q = single('q1', { visibleWhen: { question: 's1', operator: 'answered' } });
      expect(errorsOf([s, q]).join('\n')).toMatch(/q1:.*static_content/);
    });

    it('checks every leaf in all/any', () => {
      const q2 = single('q2', {
        visibleWhen: {
          any: [
            { question: 'q1', operator: 'equals', value: 'zzz' },
            { question: 'q1', operator: 'gt', value: 1 },
          ],
        },
      });
      expect(errorsOf([single('q1'), q2]).length).toBe(2);
    });
  });

  describe('operator/type compatibility', () => {
    const cond = (operator: string, value?: unknown) =>
      single('q2', { visibleWhen: { question: 'ref', operator, value } });

    it('contains only on multi-select', () => {
      expect(errorsOf([single('ref'), cond('contains', 'a')]).join('\n')).toMatch(
        /requires a multi-select/,
      );
      expect(errorsOf([multi('ref'), cond('contains', 'a')])).toEqual([]);
      expect(errorsOf([multi('ref'), cond('not_contains', ['a', 'b'])])).toEqual([]);
    });

    it('contains values must be option ids', () => {
      expect(errorsOf([multi('ref'), cond('contains', 'zzz')]).join('\n')).toMatch(
        /"zzz" is not an option id/,
      );
      expect(errorsOf([multi('ref'), cond('contains', ['a', 'zzz'])]).join('\n')).toMatch(/"zzz"/);
      expect(errorsOf([multi('ref'), cond('contains')]).join('\n')).toMatch(
        /requires an option id/,
      );
    });

    it('equals / not_equals on single-select need an existing option id', () => {
      expect(errorsOf([single('ref'), cond('equals', 'a')])).toEqual([]);
      expect(errorsOf([single('ref'), cond('not_equals', 'zzz')]).join('\n')).toMatch(/"zzz"/);
      expect(errorsOf([single('ref'), cond('equals', 3)]).join('\n')).toMatch(
        /option id \(string\)/,
      );
      expect(errorsOf([single('ref'), cond('equals', ['a'])]).join('\n')).toMatch(
        /string or number/,
      );
      expect(errorsOf([single('ref'), cond('equals')]).join('\n')).toMatch(/string or number/);
    });

    it('equals on multi-select or text is rejected', () => {
      expect(errorsOf([multi('ref'), cond('equals', 'a')]).join('\n')).toMatch(/not supported/);
      const text = base('ref', { type: 'short_text' });
      expect(errorsOf([text, cond('equals', 'a')]).join('\n')).toMatch(/not supported/);
    });

    it('equals on number takes numeric values', () => {
      expect(errorsOf([num('ref'), cond('equals', 3)])).toEqual([]);
      expect(errorsOf([num('ref'), cond('equals', 'a')]).join('\n')).toMatch(/numeric value/);
    });

    it('in / not_in require array values of option ids on single-select', () => {
      expect(errorsOf([single('ref'), cond('in', ['a', 'b'])])).toEqual([]);
      expect(errorsOf([single('ref'), cond('not_in', ['a'])])).toEqual([]);
      expect(errorsOf([single('ref'), cond('in', 'a')]).join('\n')).toMatch(/requires an array/);
      expect(errorsOf([single('ref'), cond('in', ['zzz'])]).join('\n')).toMatch(/"zzz"/);
      expect(errorsOf([multi('ref'), cond('in', ['a'])]).join('\n')).toMatch(/single-select/);
    });

    it('gt/gte/lt/lte only on numeric types with numeric value', () => {
      for (const op of ['gt', 'gte', 'lt', 'lte']) {
        expect(errorsOf([num('ref'), cond(op, 3)])).toEqual([]);
        expect(errorsOf([single('ref'), cond(op, 3)]).join('\n')).toMatch(
          /requires a numeric question/,
        );
        expect(errorsOf([num('ref'), cond(op, '3')]).join('\n')).toMatch(/numeric value/);
      }
      const stars = base('ref', {
        type: 'stars',
        options: [
          { id: 's1', label: t('1'), value: 1 },
          { id: 's2', label: t('2'), value: 2 },
        ],
      });
      expect(errorsOf([stars, cond('gte', 2)])).toEqual([]);
    });

    it('answered / not_answered must have no value', () => {
      expect(errorsOf([single('ref'), cond('answered')])).toEqual([]);
      expect(errorsOf([single('ref'), cond('not_answered')])).toEqual([]);
      expect(errorsOf([single('ref'), cond('answered', 'a')]).join('\n')).toMatch(
        /must not have a value/,
      );
    });
  });

  describe('rating options', () => {
    it('requires an integer value on non-NA stars/smileys options', () => {
      const q = base('q1', {
        type: 'stars',
        options: [
          { id: 's1', label: t('1'), value: 1 },
          { id: 's2', label: t('2') },
        ],
      });
      expect(errorsOf([q]).join('\n')).toMatch(/q1: option "s2" must have an integer value/);
    });

    it('requires unique values', () => {
      const q = base('q1', {
        type: 'smileys',
        options: [
          { id: 's1', label: t('1'), value: 1 },
          { id: 's2', label: t('2'), value: 1 },
        ],
      });
      expect(errorsOf([q]).join('\n')).toMatch(/q1: duplicate option value 1/);
    });

    it('forbids value on notApplicable options', () => {
      const q = base('q1', {
        type: 'stars',
        options: [
          { id: 's1', label: t('1'), value: 1 },
          { id: 'na', label: t('NA'), value: 9, notApplicable: true },
        ],
      });
      expect(errorsOf([q]).join('\n')).toMatch(
        /q1: notApplicable option "na" must not have a value/,
      );
    });
  });

  describe('selection rules', () => {
    it('forbids exclusive on single-select types', () => {
      const options = [{ id: 'a', label: t('a'), exclusive: true }, ...opts('b')];
      for (const type of ['single_choice', 'select']) {
        expect(errorsOf([base('q1', { type, options })]).join('\n')).toMatch(/q1:.*exclusive/);
      }
      const singleButtons = base('q1', { type: 'buttons', selection: 'single', options });
      expect(errorsOf([singleButtons]).join('\n')).toMatch(/exclusive/);
      const multiButtons = base('q1', { type: 'buttons', selection: 'multiple', options });
      expect(errorsOf([multiButtons])).toEqual([]);
    });

    it('multi-select minSelected <= maxSelected <= options', () => {
      expect(
        errorsOf([multi('m1', { validation: { minSelected: 3, maxSelected: 2 } })]).join('\n'),
      ).toMatch(/m1: minSelected \(3\) must be <= maxSelected \(2\)/);
      expect(errorsOf([multi('m1', { validation: { maxSelected: 4 } })]).join('\n')).toMatch(
        /m1: maxSelected \(4\) must be <= number of options \(3\)/,
      );
      expect(errorsOf([multi('m1', { validation: { minSelected: 1, maxSelected: 3 } })])).toEqual(
        [],
      );
    });
  });

  describe('numeric and text bounds', () => {
    const slider = (validation: Q, extra: Q = {}) =>
      base('sl', {
        type: 'slider',
        validation,
        minLabel: t('lo'),
        maxLabel: t('hi'),
        ...extra,
      });

    it('slider min < max', () => {
      expect(errorsOf([slider({ min: 5, max: 5 })]).join('\n')).toMatch(/sl: slider min/);
      expect(errorsOf([slider({ min: 0, max: 5 })])).toEqual([]);
    });

    it('slider/number step > 0', () => {
      expect(errorsOf([slider({ min: 0, max: 5, step: 0 })]).length).toBeGreaterThan(0);
      expect(errorsOf([num('n1', { validation: { step: -1 } })]).length).toBeGreaterThan(0);
    });

    it('slider naOptions must be notApplicable', () => {
      const q = slider({ min: 0, max: 5 }, { naOptions: [{ id: 'unsure', label: t('Unsure') }] });
      expect(errorsOf([q]).join('\n')).toMatch(
        /sl: slider naOption "unsure" must have notApplicable/,
      );
    });

    it('number min < max when both present', () => {
      expect(errorsOf([num('n1', { validation: { min: 5, max: 1 } })]).join('\n')).toMatch(
        /n1: number min/,
      );
      expect(errorsOf([num('n1', { validation: { min: 5 } })])).toEqual([]);
    });

    it('text minLength <= maxLength', () => {
      const q = base('t1', { type: 'short_text', validation: { minLength: 10, maxLength: 5 } });
      expect(errorsOf([q]).join('\n')).toMatch(/t1: minLength \(10\) must be <= maxLength \(5\)/);
    });
  });

  describe('screens', () => {
    it('rejects non-contiguous screen groups', () => {
      const errors = errorsOf([
        single('q1', { screen: 'one' }),
        single('q2', { screen: 'two' }),
        single('q3', { screen: 'one' }),
      ]);
      expect(errors.join('\n')).toMatch(/q3: screen "one" is not contiguous/);
    });

    it('accepts contiguous groups', () => {
      expect(
        errorsOf([single('q1', { screen: 'one' }), single('q2', { screen: 'one' }), single('q3')]),
      ).toEqual([]);
    });
  });

  it('collects all errors at once', () => {
    const errors = errorsOf([
      single('q1'),
      single('q1'),
      single('q2', { visibleWhen: { question: 'q9', operator: 'answered' } }),
      num('n1', { validation: { min: 5, max: 1 } }),
    ]);
    expect(errors.length).toBe(3);
  });
});

describe('assertValidSurveyDefinition', () => {
  it('returns the parsed definition (applying defaults)', () => {
    const parsed = assertValidSurveyDefinition(def([single('q1')]));
    expect(parsed.rewardEligible).toBe(false);
    expect(parsed.responsePolicy.maxCompletedPerInvitation).toBe(1);
  });

  it('throws listing all errors with survey id and version', () => {
    const bad = def([single('q1'), single('q1'), num('n1', { validation: { min: 5, max: 1 } })]);
    expect(() => assertValidSurveyDefinition(bad)).toThrow(/"test_survey" v1/);
    expect(() => assertValidSurveyDefinition(bad)).toThrow(/duplicate question id/);
    expect(() => assertValidSurveyDefinition(bad)).toThrow(/number min/);
  });

  it('throws for non-object input', () => {
    expect(() => assertValidSurveyDefinition(null)).toThrow(/Invalid survey definition/);
  });
});

import {
  surveyDefinitionSchema,
  type AnswerableQuestion,
  type LocalizedText,
  type SurveyAnswers,
  type SurveyDefinition,
} from './definition-schema';
import {
  evaluateCondition,
  getNumericValue,
  getProgress,
  getScreens,
  getVisibleQuestions,
  localize,
  pruneHiddenAnswers,
  validateAnswer,
  validateSubmission,
} from './engine';

const t = (label: string): LocalizedText => ({
  'en-US': label,
  'pt-PT': label,
  'es-ES': label,
  'fr-FR': label,
  'de-DE': label,
});

const opts = (...ids: string[]) => ids.map((id) => ({ id, label: t(id) }));
const base = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  label: t(id),
  dimension: 'dim',
  required: false,
  ...extra,
});

const buildDef = (questions: Record<string, unknown>[]): SurveyDefinition =>
  surveyDefinitionSchema.parse({
    schemaVersion: 1,
    id: 'engine_test',
    version: 1,
    purpose: 'Testing',
    title: t('Title'),
    description: t('Description'),
    completionMessage: t('Thanks'),
    estimatedMinutes: 2,
    responsePolicy: { identity: 'invitation' },
    questions,
  });

const choice = (...optionIds: string[]) => ({ kind: 'choice' as const, optionIds });
const text = (value: string) => ({ kind: 'text' as const, text: value });
const number = (value: number) => ({ kind: 'number' as const, value });

const stars = [
  { id: 's1', label: t('1'), value: 1 },
  { id: 's2', label: t('2'), value: 2 },
  { id: 's3', label: t('3'), value: 3 },
  { id: 's4', label: t('4'), value: 4 },
  { id: 's5', label: t('5'), value: 5 },
  { id: 'na', label: t('N/A'), notApplicable: true },
];

const def = buildDef([
  { id: 'intro', type: 'static_content', label: t('Hello') },
  base('A02', {
    type: 'single_choice',
    required: true,
    options: opts('started', 'not_started', 'unsure'),
  }),
  base('A03A', {
    type: 'short_text',
    visibleWhen: { question: 'A02', operator: 'equals', value: 'started' },
    screen: 'why',
  }),
  base('A03B', {
    type: 'long_text',
    validation: { minLength: 3, maxLength: 20 },
    visibleWhen: { question: 'A02', operator: 'in', value: ['not_started', 'unsure'] },
    screen: 'why',
  }),
  base('RATE', { type: 'stars', options: stars }),
  base('RATE_WHY', {
    type: 'short_text',
    visibleWhen: { question: 'RATE', operator: 'lt', value: 3 },
  }),
  base('RATE_NA', {
    type: 'short_text',
    visibleWhen: { question: 'RATE', operator: 'gte', value: 0 },
  }),
  base('FEATS', {
    type: 'multi_choice',
    options: [
      ...opts('a', 'b', 'c'),
      { id: 'none', label: t('None'), exclusive: true },
      { id: 'other', label: t('Other'), allowOtherText: true },
    ],
    validation: { minSelected: 1, maxSelected: 3 },
  }),
  base('FEATS_A', {
    type: 'short_text',
    visibleWhen: { question: 'FEATS', operator: 'contains', value: 'a' },
  }),
  base('FEATS_NOT_B', {
    type: 'short_text',
    visibleWhen: { question: 'FEATS', operator: 'not_contains', value: 'b' },
  }),
  base('SLIDE', {
    type: 'slider',
    validation: { min: 0, max: 1, step: 0.1 },
    minLabel: t('lo'),
    maxLabel: t('hi'),
    naOptions: [{ id: 'unsure', label: t('Unsure'), notApplicable: true }],
  }),
  base('SLIDE_HI', {
    type: 'short_text',
    visibleWhen: { question: 'SLIDE', operator: 'gt', value: 0.5 },
  }),
  base('NUM', { type: 'number', validation: { min: 1, max: 10, step: 1, integer: true } }),
  base('NUM_LE', {
    type: 'short_text',
    visibleWhen: { question: 'NUM', operator: 'lte', value: 3 },
  }),
  base('NOT_ANS', {
    type: 'short_text',
    visibleWhen: { question: 'NUM', operator: 'not_answered' },
  }),
  base('ANS', {
    type: 'short_text',
    visibleWhen: { question: 'NUM', operator: 'answered' },
  }),
  base('ALL', {
    type: 'short_text',
    visibleWhen: {
      all: [
        { question: 'A02', operator: 'not_equals', value: 'unsure' },
        { question: 'NUM', operator: 'gte', value: 2 },
      ],
    },
  }),
  base('ANY', {
    type: 'short_text',
    visibleWhen: {
      any: [
        { question: 'A02', operator: 'equals', value: 'unsure' },
        { question: 'NUM', operator: 'gt', value: 8 },
      ],
    },
  }),
  base('NOTIN', {
    type: 'short_text',
    visibleWhen: { question: 'A02', operator: 'not_in', value: ['started'] },
  }),
  base('BTN', { type: 'buttons', selection: 'single', options: opts('x', 'y') }),
  base('SEL', { type: 'select', options: opts('x', 'y') }),
  base('SMILE', {
    type: 'smileys',
    options: [
      { id: 'bad', label: t('Bad'), value: 1 },
      { id: 'good', label: t('Good'), value: 2 },
    ],
  }),
]);

const q = (id: string) => def.questions.find((x) => x.id === id)!;
const aq = (id: string) => q(id) as AnswerableQuestion;
const visibleIds = (answers: SurveyAnswers) => getVisibleQuestions(def, answers).map((x) => x.id);

describe('localize', () => {
  const text5: LocalizedText = {
    'en-US': 'Hello',
    'pt-PT': 'Ola',
    'es-ES': 'Hola',
    'fr-FR': 'Salut',
    'de-DE': 'Hallo',
  };

  it('uses the exact locale', () => {
    expect(localize(text5, 'fr-FR')).toBe('Salut');
  });

  it('falls back by language prefix', () => {
    expect(localize(text5, 'pt')).toBe('Ola');
    expect(localize(text5, 'de-AT')).toBe('Hallo');
    expect(localize(text5, 'es_MX')).toBe('Hola');
  });

  it('falls back to en-US', () => {
    expect(localize(text5, 'ja-JP')).toBe('Hello');
    expect(localize(text5, '')).toBe('Hello');
  });
});

describe('getNumericValue', () => {
  it('reads number and slider values', () => {
    expect(getNumericValue(q('NUM'), number(4))).toBe(4);
    expect(getNumericValue(q('SLIDE'), number(0.3))).toBe(0.3);
  });

  it('slider na has no numeric value', () => {
    expect(getNumericValue(q('SLIDE'), { kind: 'na', optionId: 'unsure' })).toBeNull();
  });

  it('stars/smileys use the option value', () => {
    expect(getNumericValue(q('RATE'), choice('s4'))).toBe(4);
    expect(getNumericValue(q('SMILE'), choice('good'))).toBe(2);
  });

  it('stars N/A option has no numeric value', () => {
    expect(getNumericValue(q('RATE'), choice('na'))).toBeNull();
  });

  it('is null for unanswered, wrong kinds and non-numeric types', () => {
    expect(getNumericValue(q('RATE'), undefined)).toBeNull();
    expect(getNumericValue(q('NUM'), text('4'))).toBeNull();
    expect(getNumericValue(q('A02'), choice('started'))).toBeNull();
    expect(getNumericValue(q('RATE'), choice('missing'))).toBeNull();
  });
});

describe('conditions and visibility', () => {
  it('static content without condition is visible; unanswered branch questions are hidden', () => {
    const ids = visibleIds({});
    expect(ids).toContain('intro');
    expect(ids).toContain('A02');
    expect(ids).not.toContain('A03A');
    expect(ids).not.toContain('A03B');
  });

  it('equals / in / not_equals', () => {
    expect(visibleIds({ A02: choice('started') })).toContain('A03A');
    expect(visibleIds({ A02: choice('started') })).not.toContain('A03B');
    expect(visibleIds({ A02: choice('unsure') })).toContain('A03B');
    expect(visibleIds({ A02: choice('not_started') })).toContain('A03B');
    expect(visibleIds({ A02: choice('started'), NUM: number(5) })).toContain('ALL');
    expect(visibleIds({ A02: choice('unsure'), NUM: number(5) })).not.toContain('ALL');
  });

  it('not_equals / not_in are false when the referenced question is unanswered', () => {
    expect(visibleIds({ NUM: number(5) })).not.toContain('ALL');
    expect(visibleIds({})).not.toContain('NOTIN');
    expect(visibleIds({ A02: choice('started') })).not.toContain('NOTIN');
    expect(visibleIds({ A02: choice('unsure') })).toContain('NOTIN');
    expect(visibleIds({})).not.toContain('ANY');
    expect(visibleIds({ A02: choice('started'), NUM: number(5) })).not.toContain('ANY');
    expect(visibleIds({ A02: choice('started'), NUM: number(9) })).toContain('ANY');
    expect(visibleIds({ A02: choice('unsure') })).toContain('ANY');
  });

  it('answered / not_answered', () => {
    expect(visibleIds({})).toContain('NOT_ANS');
    expect(visibleIds({})).not.toContain('ANS');
    expect(visibleIds({ NUM: number(2) })).toContain('ANS');
    expect(visibleIds({ NUM: number(2) })).not.toContain('NOT_ANS');
  });

  it('whitespace-only text counts as unanswered', () => {
    const d = buildDef([
      base('T', { type: 'short_text' }),
      base('F', {
        type: 'short_text',
        visibleWhen: { question: 'T', operator: 'answered' },
      }),
    ]);
    expect(getVisibleQuestions(d, { T: text('   ') }).map((x) => x.id)).toEqual(['T']);
    expect(getVisibleQuestions(d, { T: text(' x ') }).map((x) => x.id)).toEqual(['T', 'F']);
  });

  it('gt/gte/lt/lte on number, slider and ratings', () => {
    expect(visibleIds({ NUM: number(3) })).toContain('NUM_LE');
    expect(visibleIds({ NUM: number(4) })).not.toContain('NUM_LE');
    expect(visibleIds({ SLIDE: number(0.8) })).toContain('SLIDE_HI');
    expect(visibleIds({ SLIDE: number(0.5) })).not.toContain('SLIDE_HI');
    expect(visibleIds({ RATE: choice('s2') })).toContain('RATE_WHY');
    expect(visibleIds({ RATE: choice('s3') })).not.toContain('RATE_WHY');
    expect(visibleIds({ RATE: choice('s1') })).toContain('RATE_NA');
  });

  it('N/A answers never match numeric comparisons', () => {
    const ids = visibleIds({ RATE: choice('na'), SLIDE: { kind: 'na', optionId: 'unsure' } });
    expect(ids).not.toContain('RATE_WHY');
    expect(ids).not.toContain('RATE_NA');
    expect(ids).not.toContain('SLIDE_HI');
  });

  it('contains / not_contains on multi-select', () => {
    expect(visibleIds({ FEATS: choice('a', 'c') })).toContain('FEATS_A');
    expect(visibleIds({ FEATS: choice('a', 'c') })).toContain('FEATS_NOT_B');
    expect(visibleIds({ FEATS: choice('b') })).not.toContain('FEATS_A');
    expect(visibleIds({ FEATS: choice('b') })).not.toContain('FEATS_NOT_B');
    // unanswered: not_contains is false too
    expect(visibleIds({})).not.toContain('FEATS_NOT_B');
  });

  it('array values on contains mean any-of; not_contains means none-of', () => {
    const d = buildDef([
      base('M', { type: 'multi_choice', options: opts('a', 'b', 'c') }),
      base('X', {
        type: 'short_text',
        visibleWhen: { question: 'M', operator: 'contains', value: ['a', 'b'] },
      }),
      base('Y', {
        type: 'short_text',
        visibleWhen: { question: 'M', operator: 'not_contains', value: ['a', 'b'] },
      }),
    ]);
    expect(getVisibleQuestions(d, { M: choice('b') }).map((x) => x.id)).toEqual(['M', 'X']);
    expect(getVisibleQuestions(d, { M: choice('c') }).map((x) => x.id)).toEqual(['M', 'Y']);
  });

  it('equals on number/slider compares numerically and slider na ids', () => {
    const d = buildDef([
      base('N', { type: 'number', validation: {} }),
      base('S', {
        type: 'slider',
        validation: { min: 0, max: 10 },
        minLabel: t('lo'),
        maxLabel: t('hi'),
        naOptions: [{ id: 'unsure', label: t('u'), notApplicable: true }],
      }),
      base('NE', {
        type: 'short_text',
        visibleWhen: { question: 'N', operator: 'equals', value: 7 },
      }),
      base('SE', {
        type: 'short_text',
        visibleWhen: { question: 'S', operator: 'equals', value: 'unsure' },
      }),
    ]);
    expect(getVisibleQuestions(d, { N: number(7) }).map((x) => x.id)).toContain('NE');
    expect(getVisibleQuestions(d, { N: number(8) }).map((x) => x.id)).not.toContain('NE');
    expect(
      getVisibleQuestions(d, { S: { kind: 'na', optionId: 'unsure' } }).map((x) => x.id),
    ).toContain('SE');
  });

  it('a hidden referenced question makes conditions false (except not_answered)', () => {
    const d = buildDef([
      base('A', { type: 'single_choice', options: opts('yes', 'no') }),
      base('B', {
        type: 'single_choice',
        options: opts('x', 'y'),
        visibleWhen: { question: 'A', operator: 'equals', value: 'yes' },
      }),
      base('C_eq', {
        type: 'short_text',
        visibleWhen: { question: 'B', operator: 'equals', value: 'x' },
      }),
      base('C_na', {
        type: 'short_text',
        visibleWhen: { question: 'B', operator: 'not_answered' },
      }),
      base('C_ne', {
        type: 'short_text',
        visibleWhen: { question: 'B', operator: 'not_equals', value: 'y' },
      }),
    ]);
    // A=no hides B; a stale B answer must not leak into C visibility.
    const ids = getVisibleQuestions(d, { A: choice('no'), B: choice('x') }).map((x) => x.id);
    expect(ids).toEqual(['A', 'C_na']);
  });

  it('evaluateCondition is directly usable with a visible set', () => {
    const answers: SurveyAnswers = { A02: choice('started') };
    const cond = { question: 'A02', operator: 'equals' as const, value: 'started' };
    expect(evaluateCondition(cond, def, answers, new Set(['A02']))).toBe(true);
    expect(evaluateCondition(cond, def, answers, new Set())).toBe(false);
    expect(
      evaluateCondition({ question: 'A02', operator: 'not_answered' }, def, answers, new Set()),
    ).toBe(true);
  });
});

describe('pruneHiddenAnswers', () => {
  it('drops stale answers after a branch switch', () => {
    const answers: SurveyAnswers = { A02: choice('started'), A03A: text('because') };
    expect(pruneHiddenAnswers(def, answers)).toEqual(answers);
    const switched = { ...answers, A02: choice('not_started') };
    expect(pruneHiddenAnswers(def, switched)).toEqual({ A02: choice('not_started') });
  });

  it('drops answers for static content and unknown ids', () => {
    const pruned = pruneHiddenAnswers(def, {
      A02: choice('started'),
      intro: text('x'),
      ghost: text('x'),
    });
    expect(pruned).toEqual({ A02: choice('started') });
  });

  it('cascades through chained hidden questions', () => {
    const d = buildDef([
      base('A', { type: 'single_choice', options: opts('yes', 'no') }),
      base('B', {
        type: 'single_choice',
        options: opts('x', 'y'),
        visibleWhen: { question: 'A', operator: 'equals', value: 'yes' },
      }),
      base('C', {
        type: 'short_text',
        visibleWhen: { question: 'B', operator: 'equals', value: 'x' },
      }),
    ]);
    expect(pruneHiddenAnswers(d, { A: choice('no'), B: choice('x'), C: text('hi') })).toEqual({
      A: choice('no'),
    });
  });
});

describe('validateAnswer', () => {
  const code = (id: string, answer: Parameters<typeof validateAnswer>[1]) =>
    validateAnswer(aq(id), answer)?.code ?? null;

  it('required vs optional', () => {
    expect(code('A02', undefined)).toBe('required');
    expect(code('A02', { kind: 'choice', optionIds: [] })).toBe('required');
    expect(code('A03A', undefined)).toBeNull();
    expect(code('A03A', text('   '))).toBeNull();
    const requiredText = { ...aq('A03A'), required: true } as AnswerableQuestion;
    expect(validateAnswer(requiredText, text('   '))).toEqual({ code: 'required' });
    expect(validateAnswer(requiredText, text(' ok '))).toBeNull();
  });

  it('invalid_kind', () => {
    expect(code('A02', text('started'))).toBe('invalid_kind');
    expect(code('NUM', choice('a'))).toBe('invalid_kind');
    expect(code('A03A', number(1))).toBe('invalid_kind');
    expect(code('SLIDE', text('x'))).toBe('invalid_kind');
    expect(code('NUM', number(Number.NaN))).toBe('invalid_kind');
  });

  it('unknown_option, duplicate_option, too_many_options', () => {
    expect(code('A02', choice('nope'))).toBe('unknown_option');
    expect(code('FEATS', choice('a', 'a'))).toBe('duplicate_option');
    expect(code('A02', choice('started', 'unsure'))).toBe('too_many_options');
    expect(code('RATE', choice('s1', 's2'))).toBe('too_many_options');
    expect(code('A02', choice('started'))).toBeNull();
  });

  it('multi-select min/max and exclusive conflict', () => {
    expect(code('FEATS', choice('a', 'b'))).toBeNull();
    expect(validateAnswer(aq('FEATS'), choice('a', 'b', 'c', 'other'))).toEqual({
      code: 'max_selected',
      params: { max: 3 },
    });
    const minTwo = {
      ...aq('FEATS'),
      validation: { minSelected: 2 },
    } as AnswerableQuestion;
    expect(validateAnswer(minTwo, choice('a'))).toEqual({
      code: 'min_selected',
      params: { min: 2 },
    });
    expect(code('FEATS', choice('none'))).toBeNull();
    expect(code('FEATS', choice('none', 'a'))).toBe('exclusive_conflict');
  });

  it('otherText only where an allowOtherText option is selected', () => {
    expect(code('FEATS', { kind: 'choice', optionIds: ['other'], otherText: ' hi ' })).toBeNull();
    expect(code('FEATS', { kind: 'choice', optionIds: ['a'], otherText: 'hi' })).toBe(
      'other_text_not_allowed',
    );
    expect(code('FEATS', { kind: 'choice', optionIds: ['a'], otherText: '   ' })).toBeNull();
    expect(
      code('FEATS', { kind: 'choice', optionIds: ['other'], otherText: 'x'.repeat(501) }),
    ).toBe('too_long');
  });

  it('text length', () => {
    expect(validateAnswer(aq('A03B'), text('ab'))).toEqual({
      code: 'too_short',
      params: { min: 3 },
    });
    expect(validateAnswer(aq('A03B'), text('x'.repeat(21)))).toEqual({
      code: 'too_long',
      params: { max: 20 },
    });
    expect(code('A03B', text('  abc  '))).toBeNull();
    expect(code('A03A', text('x'.repeat(501)))).toBe('too_long');
  });

  it('number bounds, integer and step', () => {
    expect(validateAnswer(aq('NUM'), number(0))).toEqual({ code: 'below_min', params: { min: 1 } });
    expect(validateAnswer(aq('NUM'), number(11))).toEqual({
      code: 'above_max',
      params: { max: 10 },
    });
    expect(code('NUM', number(2.5))).toBe('not_integer');
    expect(code('NUM', number(5))).toBeNull();
    const stepped = buildDef([
      base('S', { type: 'number', validation: { min: 1, max: 100, step: 5 } }),
    ]).questions[0] as AnswerableQuestion;
    expect(validateAnswer(stepped, number(7))).toEqual({
      code: 'step_mismatch',
      params: { step: 5 },
    });
    expect(validateAnswer(stepped, number(6))).toBeNull();
  });

  it('slider numbers respect step with float tolerance; na must be a known option', () => {
    expect(code('SLIDE', number(0.3))).toBeNull();
    expect(code('SLIDE', number(0.7))).toBeNull();
    expect(code('SLIDE', number(0.35))).toBe('step_mismatch');
    expect(code('SLIDE', number(1.1))).toBe('above_max');
    expect(code('SLIDE', { kind: 'na', optionId: 'unsure' })).toBeNull();
    expect(code('SLIDE', { kind: 'na', optionId: 'other' })).toBe('unknown_option');
  });

  it('stars N/A option is a valid answer', () => {
    expect(code('RATE', choice('na'))).toBeNull();
    expect(code('RATE', choice('s5'))).toBeNull();
  });
});

describe('validateSubmission', () => {
  it('flags required questions only when visible', () => {
    const result = validateSubmission(def, {});
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({ A02: 'required' });
    expect(result.shownQuestionIds).not.toContain('intro');
    expect(result.shownQuestionIds).toContain('A02');
  });

  it('is ok when only visible, valid answers are present', () => {
    const result = validateSubmission(def, { A02: choice('started') });
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.shownQuestionIds.slice(0, 2)).toEqual(['A02', 'A03A']);
  });

  it('prunes stale hidden answers after a branch switch', () => {
    const result = validateSubmission(def, {
      A02: choice('not_started'),
      A03A: text('stale'),
      A03B: text('because'),
    });
    expect(result.ok).toBe(true);
    expect(result.answers).toEqual({ A02: choice('not_started'), A03B: text('because') });
    expect(result.shownQuestionIds).toContain('A03B');
    expect(result.shownQuestionIds).not.toContain('A03A');
  });

  it('does not validate hidden questions even with invalid stale answers', () => {
    const result = validateSubmission(def, { A02: choice('started'), A03B: text('x') });
    expect(result.ok).toBe(true);
    expect(result.answers).toEqual({ A02: choice('started') });
  });

  it('silently drops unknown question ids and static content answers', () => {
    const result = validateSubmission(def, {
      A02: choice('started'),
      ghost: text('boo'),
      intro: text('nope'),
    });
    expect(result.ok).toBe(true);
    expect(result.answers).toEqual({ A02: choice('started') });
    expect(result.errors).toEqual({});
  });

  it('trims text and otherText and drops empty answers', () => {
    const result = validateSubmission(def, {
      A02: choice('started'),
      A03A: text('   '),
      FEATS: { kind: 'choice', optionIds: ['other'], otherText: '  custom  ' },
    });
    expect(result.answers).toEqual({
      A02: choice('started'),
      FEATS: { kind: 'choice', optionIds: ['other'], otherText: 'custom' },
    });
    const withText = validateSubmission(def, { A02: choice('started'), A03A: text('  hey  ') });
    expect(withText.answers.A03A).toEqual(text('hey'));
  });

  it('reports exclusive conflicts, N/A ratings and invalid values by question id', () => {
    const result = validateSubmission(def, {
      A02: choice('started'),
      FEATS: choice('none', 'a'),
      RATE: choice('na'),
      NUM: number(99),
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({ FEATS: 'exclusive_conflict', NUM: 'above_max' });
    // N/A rating is valid and has no numeric value, so numeric follow-ups stay hidden.
    expect(result.shownQuestionIds).not.toContain('RATE_WHY');
  });

  it('does not mutate its input', () => {
    const raw: SurveyAnswers = { A02: choice('not_started'), A03A: text('stale') };
    const copy = JSON.parse(JSON.stringify(raw)) as SurveyAnswers;
    validateSubmission(def, raw);
    expect(raw).toEqual(copy);
  });
});

describe('getScreens and getProgress', () => {
  it('groups contiguous screen ids; others get their own screen', () => {
    const screens = getScreens(def, { A02: choice('started') });
    expect(screens.slice(0, 3).map((s) => [s.id, s.questions.map((x) => x.id)])).toEqual([
      ['intro', ['intro']],
      ['A02', ['A02']],
      ['why', ['A03A']],
    ]);
    const both = buildDef([
      base('a', { type: 'short_text', screen: 'g' }),
      base('b', { type: 'short_text', screen: 'g' }),
      base('c', { type: 'short_text' }),
    ]);
    expect(getScreens(both, {}).map((s) => [s.id, s.questions.map((x) => x.id)])).toEqual([
      ['g', ['a', 'b']],
      ['c', ['c']],
    ]);
  });

  it('hidden questions do not form screens', () => {
    const ids = getScreens(def, {}).map((s) => s.id);
    expect(ids).not.toContain('why');
  });

  it('progress excludes hidden questions and clamps', () => {
    const base0 = getProgress(def, { A02: choice('started') }, 0);
    expect(base0.current).toBe(1);
    const total = getScreens(def, { A02: choice('started') }).length;
    expect(base0.total).toBe(total);

    const hiddenTotal = getProgress(def, {}, 0).total;
    const shownTotal = getProgress(def, { A02: choice('started'), NUM: number(5) }, 0).total;
    expect(shownTotal).toBeGreaterThan(hiddenTotal);

    expect(getProgress(def, {}, -5).current).toBe(1);
    const last = getProgress(def, {}, 999);
    expect(last).toEqual({ current: last.total, total: last.total, percent: 100 });
    expect(getProgress(def, {}, 1).percent).toBe(Math.round((2 / hiddenTotal) * 100));
  });
});

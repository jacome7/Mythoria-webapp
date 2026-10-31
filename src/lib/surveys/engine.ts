import {
  isAnswerable,
  isMultiSelect,
  isSingleSelect,
  SURVEY_SOURCE_LOCALE,
  type AnswerableQuestion,
  type AnswerValue,
  type LeafCondition,
  type LocalizedText,
  type SurveyAnswers,
  type SurveyCondition,
  type SurveyDefinition,
  type SurveyOption,
  type SurveyQuestion,
} from './definition-schema';

/**
 * Pure survey engine shared by the browser (live branching, progress, inline validation) and the
 * server (authoritative submission validation). No React, DB or Node-only APIs.
 *
 * Branching relies on the definition invariant (enforced by `validateSurveyDefinition`) that a
 * `visibleWhen` condition only references EARLIER questions, so visibility is a single forward pass.
 */

export type SurveyAnswerErrorCode =
  | 'required'
  | 'invalid_kind'
  | 'unknown_option'
  | 'too_many_options'
  | 'min_selected'
  | 'max_selected'
  | 'exclusive_conflict'
  | 'other_text_not_allowed'
  | 'too_long'
  | 'too_short'
  | 'below_min'
  | 'above_max'
  | 'not_integer'
  | 'step_mismatch'
  | 'duplicate_option';

export interface SurveyAnswerError {
  code: SurveyAnswerErrorCode;
  params?: Record<string, number>;
}

export interface SurveyScreen {
  id: string;
  questions: SurveyQuestion[];
}

/** Maximum length of the optional "other" free text on a choice answer. */
export const OTHER_TEXT_MAX_LENGTH = 500;
/** Length caps applied to text questions that declare no `validation.maxLength`. */
export const DEFAULT_SHORT_TEXT_MAX_LENGTH = 500;
export const DEFAULT_LONG_TEXT_MAX_LENGTH = 5000;

const STEP_TOLERANCE = 1e-9;

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const questionIndexCache = new WeakMap<SurveyDefinition, Map<string, SurveyQuestion>>();

function questionIndex(def: SurveyDefinition): Map<string, SurveyQuestion> {
  let index = questionIndexCache.get(def);
  if (!index) {
    index = new Map();
    for (const q of def.questions) if (!index.has(q.id)) index.set(q.id, q);
    questionIndexCache.set(def, index);
  }
  return index;
}

function optionsOf(question: SurveyQuestion): SurveyOption[] {
  if ('options' in question) return question.options;
  if (question.type === 'slider') return question.naOptions ?? [];
  return [];
}

function trimAnswer(answer: AnswerValue): AnswerValue | undefined {
  switch (answer.kind) {
    case 'text': {
      const text = answer.text.trim();
      return text === '' ? undefined : { kind: 'text', text };
    }
    case 'choice': {
      if (answer.optionIds.length === 0) return undefined;
      const otherText = answer.otherText?.trim();
      return otherText
        ? { kind: 'choice', optionIds: answer.optionIds, otherText }
        : { kind: 'choice', optionIds: answer.optionIds };
    }
    default:
      return answer;
  }
}

/** True when the answer counts as "answered" (non-empty after trimming). */
function isAnswered(answer: AnswerValue | undefined): answer is AnswerValue {
  return answer !== undefined && trimAnswer(answer) !== undefined;
}

/** The single scalar a leaf `equals`/`in` compares: option id, or numeric value, or N/A id. */
function scalarOf(answer: AnswerValue): string | number | null {
  switch (answer.kind) {
    case 'choice':
      return answer.optionIds.length === 1 ? answer.optionIds[0] : null;
    case 'number':
      return answer.value;
    case 'na':
      return answer.optionId;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Numeric value + conditions
// ---------------------------------------------------------------------------------------------

/**
 * Numeric value of an answer: number/slider -> the number; stars/smileys -> selected option's
 * `value`. N/A answers (slider `na`, `notApplicable` options), text, other types -> `null`.
 */
export function getNumericValue(
  question: SurveyQuestion,
  answer: AnswerValue | undefined,
): number | null {
  if (!answer) return null;
  if (question.type === 'number' || question.type === 'slider') {
    return answer.kind === 'number' ? answer.value : null;
  }
  if (question.type === 'stars' || question.type === 'smileys') {
    if (answer.kind !== 'choice' || answer.optionIds.length !== 1) return null;
    const option = question.options.find((o) => o.id === answer.optionIds[0]);
    if (!option || option.notApplicable || typeof option.value !== 'number') return null;
    return option.value;
  }
  return null;
}

function evaluateLeaf(
  leaf: LeafCondition,
  def: SurveyDefinition,
  answers: SurveyAnswers,
  visible: Set<string>,
): boolean {
  const question = questionIndex(def).get(leaf.question);
  const answer = answers[leaf.question];
  const live = !!question && isAnswerable(question) && visible.has(leaf.question);
  const answered = live && isAnswered(answer);

  if (leaf.operator === 'not_answered') return !answered;
  if (!answered || !question || !answer) return false;
  if (leaf.operator === 'answered') return true;

  const value = leaf.value;
  switch (leaf.operator) {
    case 'equals':
    case 'not_equals': {
      if (typeof value !== 'string' && typeof value !== 'number') return false;
      const scalar = scalarOf(answer);
      const equal = scalar !== null && scalar === value;
      return leaf.operator === 'equals' ? equal : !equal;
    }
    case 'in':
    case 'not_in': {
      if (!Array.isArray(value)) return false;
      const scalar = scalarOf(answer);
      const member = typeof scalar === 'string' && value.includes(scalar);
      return leaf.operator === 'in' ? member : !member;
    }
    case 'contains':
    case 'not_contains': {
      if (answer.kind !== 'choice') return false;
      const wanted = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
      // Array value = any-of for `contains`, none-of for `not_contains`.
      const anyHit = wanted.some((id) => answer.optionIds.includes(id));
      return leaf.operator === 'contains' ? anyHit : !anyHit;
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const numeric = getNumericValue(question, answer);
      if (numeric === null || typeof value !== 'number') return false;
      if (leaf.operator === 'gt') return numeric > value;
      if (leaf.operator === 'gte') return numeric >= value;
      if (leaf.operator === 'lt') return numeric < value;
      return numeric <= value;
    }
    default:
      return false;
  }
}

/**
 * Evaluate a `visibleWhen` condition. A referenced question that is hidden or unanswered makes
 * every operator false except `not_answered`. `all`/`any` combine leaves.
 */
export function evaluateCondition(
  condition: SurveyCondition,
  def: SurveyDefinition,
  answers: SurveyAnswers,
  visible: Set<string>,
): boolean {
  if ('all' in condition) {
    return condition.all.every((leaf) => evaluateLeaf(leaf, def, answers, visible));
  }
  if ('any' in condition) {
    return condition.any.some((leaf) => evaluateLeaf(leaf, def, answers, visible));
  }
  return evaluateLeaf(condition, def, answers, visible);
}

// ---------------------------------------------------------------------------------------------
// Visibility, pruning, screens, progress
// ---------------------------------------------------------------------------------------------

/** Visible questions in definition order (static content included when visible). */
export function getVisibleQuestions(
  def: SurveyDefinition,
  answers: SurveyAnswers,
): SurveyQuestion[] {
  const visibleIds = new Set<string>();
  const result: SurveyQuestion[] = [];
  for (const q of def.questions) {
    if (!q.visibleWhen || evaluateCondition(q.visibleWhen, def, answers, visibleIds)) {
      visibleIds.add(q.id);
      result.push(q);
    }
  }
  return result;
}

/** Drop answers for hidden questions, static content and unknown question ids. */
export function pruneHiddenAnswers(def: SurveyDefinition, answers: SurveyAnswers): SurveyAnswers {
  let current = answers;
  // Forward-only references mean one pass suffices; re-check on the pruned set to be safe.
  for (let i = 0; i <= def.questions.length; i += 1) {
    const visibleIds = new Set(
      getVisibleQuestions(def, current)
        .filter(isAnswerable)
        .map((q) => q.id),
    );
    const next: SurveyAnswers = {};
    for (const [id, answer] of Object.entries(current)) {
      if (visibleIds.has(id)) next[id] = answer;
    }
    if (Object.keys(next).length === Object.keys(current).length) return next;
    current = next;
  }
  return current;
}

/** Visible questions grouped by contiguous `screen` id; a question without screen is its own. */
export function getScreens(def: SurveyDefinition, answers: SurveyAnswers): SurveyScreen[] {
  const screens: SurveyScreen[] = [];
  let lastGroup: string | undefined;
  for (const q of getVisibleQuestions(def, answers)) {
    if (q.screen !== undefined && q.screen === lastGroup) {
      screens[screens.length - 1].questions.push(q);
    } else {
      screens.push({ id: q.screen ?? q.id, questions: [q] });
    }
    lastGroup = q.screen;
  }
  return screens;
}

/**
 * Progress along the CURRENT visible path (hidden questions are not counted). `current` is
 * 1-based and clamped to [1, total]; `percent` is `current / total` rounded (0 when no screens).
 */
export function getProgress(
  def: SurveyDefinition,
  answers: SurveyAnswers,
  currentScreenIndex: number,
): { current: number; total: number; percent: number } {
  const total = getScreens(def, answers).length;
  if (total === 0) return { current: 0, total: 0, percent: 0 };
  const index = Number.isFinite(currentScreenIndex) ? Math.trunc(currentScreenIndex) : 0;
  const current = Math.min(Math.max(index + 1, 1), total);
  return { current, total, percent: Math.round((current / total) * 100) };
}

// ---------------------------------------------------------------------------------------------
// Answer validation
// ---------------------------------------------------------------------------------------------

function err(code: SurveyAnswerErrorCode, params?: Record<string, number>): SurveyAnswerError {
  return params ? { code, params } : { code };
}

function validateRange(
  value: number,
  validation: { min?: number; max?: number; step?: number; integer?: boolean },
): SurveyAnswerError | null {
  if (!Number.isFinite(value)) return err('invalid_kind');
  if (validation.integer && !Number.isInteger(value)) return err('not_integer');
  if (validation.min !== undefined && value < validation.min) {
    return err('below_min', { min: validation.min });
  }
  if (validation.max !== undefined && value > validation.max) {
    return err('above_max', { max: validation.max });
  }
  if (validation.step !== undefined && validation.step > 0) {
    const ratio = (value - (validation.min ?? 0)) / validation.step;
    if (Math.abs(ratio - Math.round(ratio)) > STEP_TOLERANCE) {
      return err('step_mismatch', { step: validation.step });
    }
  }
  return null;
}

function validateChoice(
  question: AnswerableQuestion,
  answer: AnswerValue,
): SurveyAnswerError | null {
  if (answer.kind !== 'choice') return err('invalid_kind');
  const options = optionsOf(question);
  const byId = new Map(options.map((o) => [o.id, o]));
  const ids = answer.optionIds;

  if (new Set(ids).size !== ids.length) return err('duplicate_option');
  if (ids.some((id) => !byId.has(id))) return err('unknown_option');
  if (isSingleSelect(question) && ids.length > 1) return err('too_many_options');

  if (isMultiSelect(question)) {
    if (ids.length > 1 && ids.some((id) => byId.get(id)?.exclusive)) {
      return err('exclusive_conflict');
    }
    const validation =
      question.type === 'multi_choice' || question.type === 'buttons'
        ? question.validation
        : undefined;
    if (validation?.minSelected !== undefined && ids.length < validation.minSelected) {
      return err('min_selected', { min: validation.minSelected });
    }
    if (validation?.maxSelected !== undefined && ids.length > validation.maxSelected) {
      return err('max_selected', { max: validation.maxSelected });
    }
  }

  const otherText = answer.otherText?.trim();
  if (otherText) {
    if (otherText.length > OTHER_TEXT_MAX_LENGTH) {
      return err('too_long', { max: OTHER_TEXT_MAX_LENGTH });
    }
    if (!ids.some((id) => byId.get(id)?.allowOtherText)) return err('other_text_not_allowed');
  }
  return null;
}

/**
 * Validate one answer against its question. Optional questions with no/empty answer are valid
 * (`null`); empty text (after trimming) counts as unanswered.
 */
export function validateAnswer(
  question: AnswerableQuestion,
  answer: AnswerValue | undefined,
): SurveyAnswerError | null {
  const normalized = answer ? trimAnswer(answer) : undefined;
  if (!normalized) return question.required ? err('required') : null;

  switch (question.type) {
    case 'single_choice':
    case 'multi_choice':
    case 'buttons':
    case 'select':
    case 'stars':
    case 'smileys':
      return validateChoice(question, normalized);

    case 'number':
      if (normalized.kind !== 'number') return err('invalid_kind');
      return validateRange(normalized.value, question.validation);

    case 'slider': {
      if (normalized.kind === 'na') {
        const known = (question.naOptions ?? []).some((o) => o.id === normalized.optionId);
        return known ? null : err('unknown_option');
      }
      if (normalized.kind !== 'number') return err('invalid_kind');
      return validateRange(normalized.value, question.validation);
    }

    case 'short_text':
    case 'long_text': {
      if (normalized.kind !== 'text') return err('invalid_kind');
      const defaultMax =
        question.type === 'short_text'
          ? DEFAULT_SHORT_TEXT_MAX_LENGTH
          : DEFAULT_LONG_TEXT_MAX_LENGTH;
      const max = question.validation?.maxLength ?? defaultMax;
      const min = question.validation?.minLength;
      if (normalized.text.length > max) return err('too_long', { max });
      if (min !== undefined && normalized.text.length < min) return err('too_short', { min });
      return null;
    }
  }
}

/**
 * Authoritative submission validation.
 *
 * - Answers whose question id does not exist (or belongs to static content) are DROPPED silently:
 *   they are neither errors nor part of the returned answers.
 * - Text and `otherText` are trimmed; empty answers are dropped (= unanswered).
 * - Answers to hidden questions are pruned; hidden questions are never validated.
 * - `errors` is keyed by question id and only covers visible answerable questions.
 */
export function validateSubmission(
  def: SurveyDefinition,
  rawAnswers: SurveyAnswers,
): {
  ok: boolean;
  answers: SurveyAnswers;
  shownQuestionIds: string[];
  errors: Record<string, SurveyAnswerErrorCode>;
} {
  const index = questionIndex(def);
  const normalized: SurveyAnswers = {};
  for (const [id, raw] of Object.entries(rawAnswers)) {
    const question = index.get(id);
    if (!question || !isAnswerable(question)) continue;
    const answer = trimAnswer(raw);
    if (answer) normalized[id] = answer;
  }

  const answers = pruneHiddenAnswers(def, normalized);
  const shown = getVisibleQuestions(def, answers).filter(isAnswerable);

  const errors: Record<string, SurveyAnswerErrorCode> = {};
  for (const question of shown) {
    const error = validateAnswer(question, answers[question.id]);
    if (error) errors[question.id] = error.code;
  }

  return {
    ok: Object.keys(errors).length === 0,
    answers,
    shownQuestionIds: shown.map((q) => q.id),
    errors,
  };
}

// ---------------------------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------------------------

/** Exact locale, else language-prefix match (`pt` -> `pt-PT`), else `en-US`. */
export function localize(text: LocalizedText, locale: string): string {
  const entries = Object.entries(text) as [string, string][];
  const wanted = (locale ?? '').toLowerCase().replace('_', '-');
  const exact = entries.find(([key]) => key.toLowerCase() === wanted);
  if (exact) return exact[1];
  const language = wanted.split('-')[0];
  if (language) {
    const byLanguage = entries.find(([key]) => key.toLowerCase().split('-')[0] === language);
    if (byLanguage) return byLanguage[1];
  }
  return text[SURVEY_SOURCE_LOCALE] ?? entries[0]?.[1] ?? '';
}

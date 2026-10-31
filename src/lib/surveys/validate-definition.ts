import {
  isMultiSelect,
  isSingleSelect,
  surveyDefinitionSchema,
  type LeafCondition,
  type SurveyDefinition,
  type SurveyOption,
  type SurveyQuestion,
} from './definition-schema';

/**
 * Validation of survey definitions: structural (zod) plus semantic checks that the schema alone
 * cannot express (unique ids, condition references, operator/type compatibility, rating values).
 * Pure module: safe on the server, in scripts and in the browser.
 */

export type ValidateSurveyDefinitionResult =
  { ok: true; definition: SurveyDefinition } | { ok: false; errors: string[] };

const NUMERIC_COMPARISON_OPERATORS = ['gt', 'gte', 'lt', 'lte'] as const;

/** Options a question exposes for answers (slider uses `naOptions`). */
function optionsOf(question: SurveyQuestion): SurveyOption[] {
  if ('options' in question) return question.options;
  if (question.type === 'slider') return question.naOptions ?? [];
  return [];
}

function isNumericType(question: SurveyQuestion): boolean {
  return (
    question.type === 'number' ||
    question.type === 'slider' ||
    question.type === 'stars' ||
    question.type === 'smileys'
  );
}

function leavesOf(question: SurveyQuestion): LeafCondition[] {
  const cond = question.visibleWhen;
  if (!cond) return [];
  if ('all' in cond) return cond.all;
  if ('any' in cond) return cond.any;
  return [cond];
}

function checkLeaf(
  qid: string,
  leaf: LeafCondition,
  index: number,
  earlier: Map<string, SurveyQuestion>,
  allIds: Set<string>,
  errors: string[],
): void {
  const where = `${qid}: visibleWhen condition ${index + 1} (${leaf.operator} ${leaf.question})`;
  const ref = earlier.get(leaf.question);
  if (!ref) {
    if (leaf.question === qid) {
      errors.push(`${where}: a question cannot reference itself`);
    } else if (allIds.has(leaf.question)) {
      errors.push(
        `${where}: references "${leaf.question}" which appears later in the list (only earlier questions can be referenced)`,
      );
    } else {
      errors.push(`${where}: references unknown question "${leaf.question}"`);
    }
    return;
  }
  if (ref.type === 'static_content') {
    errors.push(`${where}: cannot reference static_content question "${leaf.question}"`);
    return;
  }

  const { operator, value } = leaf;
  const optionIds = new Set(optionsOf(ref).map((o) => o.id));
  const checkIds = (ids: string[]) => {
    for (const id of ids) {
      if (!optionIds.has(id)) {
        errors.push(`${where}: "${id}" is not an option id of "${ref.id}"`);
      }
    }
  };

  switch (operator) {
    case 'answered':
    case 'not_answered':
      if (value !== undefined) errors.push(`${where}: ${operator} must not have a value`);
      return;

    case 'contains':
    case 'not_contains': {
      if (!isMultiSelect(ref)) {
        errors.push(
          `${where}: ${operator} requires a multi-select question ("${ref.id}" is ${ref.type})`,
        );
        return;
      }
      if (typeof value === 'string') checkIds([value]);
      else if (Array.isArray(value)) checkIds(value);
      else errors.push(`${where}: ${operator} requires an option id (or an array of option ids)`);
      return;
    }

    case 'equals':
    case 'not_equals': {
      if (value === undefined || Array.isArray(value)) {
        errors.push(`${where}: ${operator} requires a string or number value`);
        return;
      }
      if (isSingleSelect(ref)) {
        if (typeof value !== 'string') {
          errors.push(`${where}: ${operator} on a choice question requires an option id (string)`);
        } else checkIds([value]);
      } else if (ref.type === 'number' || ref.type === 'slider') {
        if (typeof value === 'string') {
          if (ref.type === 'slider') checkIds([value]);
          else errors.push(`${where}: ${operator} on a number question requires a numeric value`);
        }
      } else {
        errors.push(`${where}: ${operator} is not supported on ${ref.type} question "${ref.id}"`);
      }
      return;
    }

    case 'in':
    case 'not_in': {
      if (!Array.isArray(value)) {
        errors.push(`${where}: ${operator} requires an array value`);
        return;
      }
      if (isSingleSelect(ref) || ref.type === 'slider') checkIds(value);
      else {
        errors.push(
          `${where}: ${operator} requires a single-select question ("${ref.id}" is ${ref.type})`,
        );
      }
      return;
    }

    default: {
      // gt / gte / lt / lte
      if (!(NUMERIC_COMPARISON_OPERATORS as readonly string[]).includes(operator)) return;
      if (!isNumericType(ref)) {
        errors.push(
          `${where}: ${operator} requires a numeric question ("${ref.id}" is ${ref.type})`,
        );
        return;
      }
      if (typeof value !== 'number') errors.push(`${where}: ${operator} requires a numeric value`);
    }
  }
}

function checkOptions(question: SurveyQuestion, errors: string[]): void {
  const qid = question.id;
  const options = optionsOf(question);

  const seen = new Set<string>();
  for (const option of options) {
    if (seen.has(option.id)) errors.push(`${qid}: duplicate option id "${option.id}"`);
    seen.add(option.id);
  }

  if (question.type === 'stars' || question.type === 'smileys') {
    const values = new Set<number>();
    for (const option of options) {
      if (option.notApplicable) {
        if (option.value !== undefined) {
          errors.push(`${qid}: notApplicable option "${option.id}" must not have a value`);
        }
        continue;
      }
      if (option.value === undefined || !Number.isInteger(option.value)) {
        errors.push(`${qid}: option "${option.id}" must have an integer value`);
        continue;
      }
      if (values.has(option.value)) {
        errors.push(`${qid}: duplicate option value ${option.value} (option "${option.id}")`);
      }
      values.add(option.value);
    }
  }

  if (isSingleSelect(question)) {
    for (const option of options) {
      if (option.exclusive) {
        errors.push(
          `${qid}: option "${option.id}" is exclusive, which is only allowed on multi-select questions`,
        );
      }
    }
  }
}

function checkTypeRules(question: SurveyQuestion, errors: string[]): void {
  const qid = question.id;

  if (question.type === 'multi_choice' || question.type === 'buttons') {
    if (!isMultiSelect(question)) return;
    const min = question.validation?.minSelected;
    const max = question.validation?.maxSelected;
    const count = question.options.length;
    if (min !== undefined && max !== undefined && min > max) {
      errors.push(`${qid}: minSelected (${min}) must be <= maxSelected (${max})`);
    }
    if (max !== undefined && max > count) {
      errors.push(`${qid}: maxSelected (${max}) must be <= number of options (${count})`);
    }
    if (min !== undefined && min > count) {
      errors.push(`${qid}: minSelected (${min}) must be <= number of options (${count})`);
    }
  }

  if (question.type === 'slider') {
    const { min, max, step } = question.validation;
    if (!(min < max)) errors.push(`${qid}: slider min (${min}) must be < max (${max})`);
    if (!(step > 0)) errors.push(`${qid}: slider step must be > 0`);
    for (const option of question.naOptions ?? []) {
      if (option.notApplicable !== true) {
        errors.push(`${qid}: slider naOption "${option.id}" must have notApplicable: true`);
      }
    }
  }

  if (question.type === 'number') {
    const { min, max, step } = question.validation;
    if (min !== undefined && max !== undefined && !(min < max)) {
      errors.push(`${qid}: number min (${min}) must be < max (${max})`);
    }
    if (step !== undefined && !(step > 0)) errors.push(`${qid}: number step must be > 0`);
  }

  if (question.type === 'short_text' || question.type === 'long_text') {
    const v = question.validation;
    if (v && v.minLength !== undefined && v.minLength > v.maxLength) {
      errors.push(`${qid}: minLength (${v.minLength}) must be <= maxLength (${v.maxLength})`);
    }
  }
}

function semanticErrors(def: SurveyDefinition): string[] {
  const errors: string[] = [];
  const allIds = new Set<string>();
  const earlier = new Map<string, SurveyQuestion>();

  for (const q of def.questions) {
    if (allIds.has(q.id)) errors.push(`${q.id}: duplicate question id`);
    allIds.add(q.id);
  }

  for (const q of def.questions) {
    checkOptions(q, errors);
    checkTypeRules(q, errors);
    leavesOf(q).forEach((leaf, i) => checkLeaf(q.id, leaf, i, earlier, allIds, errors));
    // First definition wins for duplicate ids; the duplicate is already reported.
    if (!earlier.has(q.id)) earlier.set(q.id, q);
  }

  // Screen groups must be contiguous.
  const closedScreens = new Set<string>();
  let currentScreen: string | undefined;
  for (const q of def.questions) {
    if (q.screen === currentScreen) continue;
    if (currentScreen !== undefined) closedScreens.add(currentScreen);
    if (q.screen !== undefined && closedScreens.has(q.screen)) {
      errors.push(
        `${q.id}: screen "${q.screen}" is not contiguous (it reappears after another screen)`,
      );
    }
    currentScreen = q.screen;
  }

  return errors;
}

export function validateSurveyDefinition(input: unknown): ValidateSurveyDefinitionResult {
  const parsed = surveyDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => {
        const path = issue.path.map(String).join('.');
        return `${path || '(root)'}: ${issue.message}`;
      }),
    };
  }
  const errors = semanticErrors(parsed.data);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, definition: parsed.data };
}

export function assertValidSurveyDefinition(input: unknown): SurveyDefinition {
  const result = validateSurveyDefinition(input);
  if (result.ok) return result.definition;

  let label = 'survey definition';
  if (input && typeof input === 'object') {
    const { id, version } = input as { id?: unknown; version?: unknown };
    if (typeof id === 'string') {
      label = `survey definition "${id}"${typeof version === 'number' ? ` v${version}` : ''}`;
    }
  }
  throw new Error(
    `Invalid ${label} (${result.errors.length} error${result.errors.length === 1 ? '' : 's'}):\n- ${result.errors.join('\n- ')}`,
  );
}

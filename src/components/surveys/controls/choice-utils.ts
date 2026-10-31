import type { AnswerValue, SurveyOption } from '@/lib/surveys/definition-schema';

/** Build a choice answer; drops `otherText` unless a selected option allows it. */
export function buildChoiceAnswer(
  optionIds: string[],
  options: SurveyOption[],
  otherText?: string,
): AnswerValue | undefined {
  if (optionIds.length === 0) return undefined;
  const allowsOther = optionIds.some((id) => options.find((o) => o.id === id)?.allowOtherText);
  return allowsOther && otherText !== undefined && otherText !== ''
    ? { kind: 'choice', optionIds, otherText }
    : { kind: 'choice', optionIds };
}

export function selectedOptionIds(value: AnswerValue | undefined): string[] {
  return value?.kind === 'choice' ? value.optionIds : [];
}

export function selectedOtherText(value: AnswerValue | undefined): string {
  return value?.kind === 'choice' ? (value.otherText ?? '') : '';
}

/**
 * Toggle an option in a multi-select. An `exclusive` option replaces everything; any other option
 * removes the exclusive ones.
 */
export function toggleMultiOption(
  current: string[],
  optionId: string,
  checked: boolean,
  options: SurveyOption[],
): string[] {
  if (!checked) return current.filter((id) => id !== optionId);
  const option = options.find((o) => o.id === optionId);
  if (option?.exclusive) return [optionId];
  const withoutExclusive = current.filter((id) => !options.find((o) => o.id === id)?.exclusive);
  return withoutExclusive.includes(optionId) ? withoutExclusive : [...withoutExclusive, optionId];
}

/** Hint kind for a multi-select, derived from its validation bounds. */
export function multiHint(validation?: { minSelected?: number; maxSelected?: number }): {
  key: 'chooseMany' | 'pickAtLeast' | 'pickUpTo' | 'pickBetween';
  min?: number;
  max?: number;
} {
  const min = validation?.minSelected;
  const max = validation?.maxSelected;
  if (min !== undefined && max !== undefined && min > 1) {
    return { key: 'pickBetween', min, max };
  }
  if (max !== undefined) return { key: 'pickUpTo', max };
  if (min !== undefined && min > 1) return { key: 'pickAtLeast', min };
  return { key: 'chooseMany' };
}

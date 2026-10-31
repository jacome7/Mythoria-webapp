import type { AnswerValue, SurveyQuestion } from '@/lib/surveys/definition-schema';

export type QuestionOfType<T extends SurveyQuestion['type']> = Extract<SurveyQuestion, { type: T }>;

/** Props shared by every survey control. Controls are controlled: the renderer owns the answers. */
export interface ControlProps<Q extends SurveyQuestion> {
  question: Q;
  locale: string;
  value: AnswerValue | undefined;
  /** `undefined` clears the answer. */
  onChange: (value: AnswerValue | undefined) => void;
  /** Already-translated inline error message. */
  error?: string;
}

export function questionDomIds(questionId: string) {
  return {
    input: `survey-q-${questionId}`,
    label: `survey-q-${questionId}-label`,
    help: `survey-q-${questionId}-help`,
    hint: `survey-q-${questionId}-hint`,
    optional: `survey-q-${questionId}-optional`,
    error: `survey-q-${questionId}-error`,
  };
}

/** `aria-describedby` value for controls that render their own input (no fieldset). */
export function describedByFor(question: SurveyQuestion, error?: string): string | undefined {
  const ids = questionDomIds(question.id);
  return (
    [
      question.help ? ids.help : null,
      question.type !== 'static_content' && !question.required ? ids.optional : null,
      error ? ids.error : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  );
}

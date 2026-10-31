'use client';

import { localize, DEFAULT_SHORT_TEXT_MAX_LENGTH } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import type { ControlProps, QuestionOfType } from './types';
import { describedByFor, questionDomIds } from './types';

export default function ShortText({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'short_text'>>) {
  const ids = questionDomIds(question.id);
  const max = question.validation?.maxLength ?? DEFAULT_SHORT_TEXT_MAX_LENGTH;
  const text = value?.kind === 'text' ? value.text : '';

  return (
    <QuestionShell question={question} locale={locale} error={error} inputId={ids.input}>
      <input
        id={ids.input}
        type="text"
        className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
        maxLength={max}
        placeholder={question.placeholder ? localize(question.placeholder, locale) : undefined}
        value={text}
        aria-required={question.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByFor(question, error)}
        onChange={(event) =>
          onChange(
            event.target.value === '' ? undefined : { kind: 'text', text: event.target.value },
          )
        }
      />
    </QuestionShell>
  );
}

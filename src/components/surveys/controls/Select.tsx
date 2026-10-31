'use client';

import { useTranslations } from 'next-intl';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import { buildChoiceAnswer, selectedOptionIds } from './choice-utils';
import type { ControlProps, QuestionOfType } from './types';
import { describedByFor, questionDomIds } from './types';

export default function Select({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'select'>>) {
  const t = useTranslations('Survey.question');
  const ids = questionDomIds(question.id);
  const selected = selectedOptionIds(value)[0] ?? '';

  return (
    <QuestionShell question={question} locale={locale} error={error} inputId={ids.input}>
      <select
        id={ids.input}
        className={`select select-bordered w-full ${error ? 'select-error' : ''}`}
        value={selected}
        aria-required={question.required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedByFor(question, error)}
        onChange={(event) =>
          onChange(
            event.target.value
              ? buildChoiceAnswer([event.target.value], question.options)
              : undefined,
          )
        }
      >
        <option value="">{t('selectPlaceholder')}</option>
        {question.options.map((option) => (
          <option key={option.id} value={option.id}>
            {localize(option.label, locale)}
          </option>
        ))}
      </select>
    </QuestionShell>
  );
}

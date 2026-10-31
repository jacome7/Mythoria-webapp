'use client';

import { useTranslations } from 'next-intl';
import { localize, DEFAULT_LONG_TEXT_MAX_LENGTH } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import type { ControlProps, QuestionOfType } from './types';
import { describedByFor, questionDomIds } from './types';

export default function LongText({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'long_text'>>) {
  const t = useTranslations('Survey.question');
  const ids = questionDomIds(question.id);
  const max = question.validation?.maxLength ?? DEFAULT_LONG_TEXT_MAX_LENGTH;
  const text = value?.kind === 'text' ? value.text : '';

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      inputId={ids.input}
      footer={<span>{t('charCount', { count: text.length, max })}</span>}
    >
      <textarea
        id={ids.input}
        className={`textarea textarea-bordered min-h-32 w-full ${error ? 'textarea-error' : ''}`}
        rows={5}
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

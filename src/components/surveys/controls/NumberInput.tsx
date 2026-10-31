'use client';

import { useState } from 'react';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import type { ControlProps, QuestionOfType } from './types';
import { describedByFor, questionDomIds } from './types';

export default function NumberInput({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'number'>>) {
  const ids = questionDomIds(question.id);
  // Keep the raw text so partial input such as "1." is not rewritten while typing.
  const [raw, setRaw] = useState(() => (value?.kind === 'number' ? String(value.value) : ''));
  const { min, max, step, integer } = question.validation;

  return (
    <QuestionShell question={question} locale={locale} error={error} inputId={ids.input}>
      <div className="flex items-center gap-2">
        <input
          id={ids.input}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          className={`input input-bordered w-full max-w-48 ${error ? 'input-error' : ''}`}
          min={min}
          max={max}
          step={step ?? (integer ? 1 : 'any')}
          value={raw}
          aria-required={question.required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByFor(question, error)}
          onChange={(event) => {
            const next = event.target.value;
            setRaw(next);
            const parsed = next.trim() === '' ? NaN : Number(next);
            onChange(Number.isFinite(parsed) ? { kind: 'number', value: parsed } : undefined);
          }}
        />
        {question.unit ? (
          <span className="text-base text-base-content/80">{localize(question.unit, locale)}</span>
        ) : null}
      </div>
    </QuestionShell>
  );
}

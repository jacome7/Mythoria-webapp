'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import type { ControlProps, QuestionOfType } from './types';
import { describedByFor, questionDomIds } from './types';

function snapToStep(value: number, min: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  // Trim floating point noise such as 0.30000000000000004.
  return Number(snapped.toFixed(10));
}

/**
 * Range input with a visible value, min/max anchor labels, an accessible numeric alternative and
 * explicit non-numeric answers (`naOptions`) as toggle buttons. The slider has no value until the
 * respondent interacts, so a default thumb position is never recorded as an answer.
 */
export default function Slider({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'slider'>>) {
  const t = useTranslations('Survey.slider');
  const ids = questionDomIds(question.id);
  const { min, max, step } = question.validation;
  const numeric = value?.kind === 'number' ? value.value : undefined;
  const naSelected = value?.kind === 'na' ? value.optionId : undefined;
  const naOptions = question.naOptions ?? [];
  const [raw, setRaw] = useState(() => (numeric !== undefined ? String(numeric) : ''));
  const midpoint = snapToStep((min + max) / 2, min, step);
  const naLabel = naOptions.find((option) => option.id === naSelected);

  const commit = (next: number) => {
    setRaw(String(next));
    onChange({ kind: 'number', value: next });
  };

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role="group"
      onClear={
        !question.required && value
          ? () => {
              setRaw('');
              onChange(undefined);
            }
          : undefined
      }
    >
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <p className="mb-3 text-center text-2xl font-semibold" aria-live="polite">
          {numeric !== undefined
            ? t('currentValue', { value: numeric })
            : naLabel
              ? t('selectedAnswer', { answer: localize(naLabel.label, locale) })
              : t('noValue')}
        </p>
        <input
          type="range"
          className={`range range-primary w-full ${numeric === undefined ? 'opacity-60' : ''}`}
          min={min}
          max={max}
          step={step}
          value={numeric ?? midpoint}
          aria-labelledby={ids.label}
          aria-describedby={describedByFor(question, error)}
          aria-valuetext={numeric === undefined ? t('noValue') : undefined}
          onChange={(event) => commit(Number(event.target.value))}
          onPointerUp={(event) => {
            if (numeric === undefined) commit(Number(event.currentTarget.value));
          }}
        />
        <div className="mt-2 flex justify-between gap-4 text-sm text-base-content/80">
          <span>
            <span className="font-semibold">{min}</span> · {localize(question.minLabel, locale)}
          </span>
          <span className="text-right">
            {localize(question.maxLabel, locale)} · <span className="font-semibold">{max}</span>
          </span>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor={`${ids.input}-number`} className="mb-1 block text-sm text-base-content/70">
          {t('numericLabel', { min, max })}
        </label>
        <input
          id={`${ids.input}-number`}
          type="number"
          inputMode="decimal"
          className="input input-bordered w-full max-w-40"
          min={min}
          max={max}
          step={step}
          value={raw}
          onChange={(event) => {
            const next = event.target.value;
            setRaw(next);
            const parsed = next.trim() === '' ? NaN : Number(next);
            onChange(Number.isFinite(parsed) ? { kind: 'number', value: parsed } : undefined);
          }}
        />
      </div>

      {naOptions.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-sm text-base-content/70">{t('otherAnswers')}</p>
          <div className="flex flex-wrap gap-2">
            {naOptions.map((option) => {
              const pressed = naSelected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={pressed}
                  className={`btn min-h-12 ${pressed ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    if (pressed) {
                      onChange(undefined);
                    } else {
                      setRaw('');
                      onChange({ kind: 'na', optionId: option.id });
                    }
                  }}
                >
                  {pressed ? <Check aria-hidden="true" className="h-4 w-4" /> : null}
                  {localize(option.label, locale)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </QuestionShell>
  );
}

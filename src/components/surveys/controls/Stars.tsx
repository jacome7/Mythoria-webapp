'use client';

import { Star } from 'lucide-react';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import { buildChoiceAnswer, selectedOptionIds } from './choice-utils';
import { NotApplicableOptions } from './RatingShared';
import type { ControlProps, QuestionOfType } from './types';
import { questionDomIds } from './types';
import styles from './RatingTiles.module.css';

/**
 * Star rating as a radio group. Each star is a visually hidden native radio whose accessible name
 * is the option label, so assistive tech announces "Good" rather than "star 4".
 */
export default function Stars({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'stars'>>) {
  const ids = questionDomIds(question.id);
  const scale = question.options.filter((option) => !option.notApplicable);
  const naOptions = question.options.filter((option) => option.notApplicable);
  const selectedId = selectedOptionIds(value)[0];
  const selectedIndex = scale.findIndex((option) => option.id === selectedId);
  const select = (optionId: string) => onChange(buildChoiceAnswer([optionId], question.options));

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role="radiogroup"
      onClear={!question.required && value ? () => onChange(undefined) : undefined}
    >
      <div className="flex w-full flex-wrap items-center justify-between gap-1 sm:max-w-xs">
        {scale.map((option, index) => {
          const filled = selectedIndex >= 0 && index <= selectedIndex;
          return (
            <label key={option.id} className="relative block">
              <input
                type="radio"
                name={ids.input}
                className="peer sr-only"
                value={option.id}
                checked={selectedId === option.id}
                onChange={() => select(option.id)}
              />
              <span
                className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-box peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary ${styles.tile}`}
              >
                <Star
                  aria-hidden="true"
                  className={`h-9 w-9 ${filled ? 'fill-warning text-warning' : 'text-base-content/40'}`}
                />
                <span className="sr-only">{localize(option.label, locale)}</span>
              </span>
            </label>
          );
        })}
      </div>
      {scale.length > 1 ? (
        <div className="mt-1 flex w-full justify-between gap-4 text-xs text-base-content/70 sm:max-w-xs">
          <span>{localize(scale[0].label, locale)}</span>
          <span className="text-right">{localize(scale[scale.length - 1].label, locale)}</span>
        </div>
      ) : null}
      <NotApplicableOptions
        options={naOptions}
        name={ids.input}
        selectedId={selectedId}
        locale={locale}
        onSelect={select}
      />
    </QuestionShell>
  );
}

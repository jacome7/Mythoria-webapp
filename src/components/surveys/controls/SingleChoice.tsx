'use client';

import { useTranslations } from 'next-intl';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import { buildChoiceAnswer, selectedOptionIds, selectedOtherText } from './choice-utils';
import type { ControlProps, QuestionOfType } from './types';
import { questionDomIds } from './types';
import styles from './RatingTiles.module.css';

/** Radio list. An option with `allowOtherText` reveals an optional text input. */
export default function SingleChoice({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'single_choice'>>) {
  const t = useTranslations('Survey.question');
  const selected = selectedOptionIds(value)[0];
  const otherText = selectedOtherText(value);
  const selectedOption = question.options.find((option) => option.id === selected);
  const ids = questionDomIds(question.id);

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role="radiogroup"
      onClear={!question.required && value ? () => onChange(undefined) : undefined}
    >
      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const label = localize(option.label, locale);
          return (
            <label
              key={option.id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${styles.tile}`}
            >
              <input
                type="radio"
                name={ids.input}
                className="radio radio-primary"
                value={option.id}
                checked={selected === option.id}
                onChange={() =>
                  onChange(
                    buildChoiceAnswer(
                      [option.id],
                      question.options,
                      option.allowOtherText ? otherText : undefined,
                    ),
                  )
                }
              />
              <span className="text-base">{label}</span>
            </label>
          );
        })}
      </div>
      {selectedOption?.allowOtherText ? (
        <div className="mt-3">
          <label htmlFor={`${ids.input}-other`} className="mb-1 block text-sm font-medium">
            {t('otherLabel')}
          </label>
          <input
            id={`${ids.input}-other`}
            type="text"
            className="input input-bordered w-full"
            maxLength={500}
            placeholder={t('otherPlaceholder')}
            value={otherText}
            onChange={(event) =>
              onChange(buildChoiceAnswer([selectedOption.id], question.options, event.target.value))
            }
          />
        </div>
      ) : null}
    </QuestionShell>
  );
}

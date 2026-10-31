'use client';

import { useTranslations } from 'next-intl';
import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import {
  buildChoiceAnswer,
  multiHint,
  selectedOptionIds,
  selectedOtherText,
  toggleMultiOption,
} from './choice-utils';
import type { ControlProps, QuestionOfType } from './types';
import { questionDomIds } from './types';
import styles from './RatingTiles.module.css';

/** Checkbox list with exclusive options ("None of these"), min/max hint and optional other text. */
export default function MultiChoice({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'multi_choice'>>) {
  const t = useTranslations('Survey.question');
  const selected = selectedOptionIds(value);
  const otherText = selectedOtherText(value);
  const ids = questionDomIds(question.id);
  const hint = multiHint(question.validation);
  const otherOption = question.options.find(
    (option) => option.allowOtherText && selected.includes(option.id),
  );

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role="group"
      hint={t(hint.key, { min: hint.min ?? 0, max: hint.max ?? 0 })}
    >
      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <label
            key={option.id}
            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3 has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary ${styles.tile}`}
          >
            <input
              type="checkbox"
              name={ids.input}
              className="checkbox checkbox-primary"
              value={option.id}
              checked={selected.includes(option.id)}
              onChange={(event) => {
                const next = toggleMultiOption(
                  selected,
                  option.id,
                  event.target.checked,
                  question.options,
                );
                onChange(buildChoiceAnswer(next, question.options, otherText));
              }}
            />
            <span className="text-base">{localize(option.label, locale)}</span>
          </label>
        ))}
      </div>
      {otherOption ? (
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
              onChange(buildChoiceAnswer(selected, question.options, event.target.value))
            }
          />
        </div>
      ) : null}
    </QuestionShell>
  );
}

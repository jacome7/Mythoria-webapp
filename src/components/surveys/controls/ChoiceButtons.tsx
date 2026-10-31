'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
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

const TILE =
  'flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 p-4 text-base font-medium transition-colors peer-checked:border-2 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary';

/**
 * Large tap-friendly tiles. Built on visually hidden native inputs so keyboard behaviour is the
 * platform one: radios (single, `role="radiogroup"`, arrow keys) or checkboxes (multiple).
 * The selected state is also shown with a check mark, never colour alone.
 */
export default function ChoiceButtons({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'buttons'>>) {
  const t = useTranslations('Survey.question');
  const multiple = question.selection === 'multiple';
  const selected = selectedOptionIds(value);
  const otherText = selectedOtherText(value);
  const ids = questionDomIds(question.id);
  const hint = multiple ? multiHint(question.validation) : null;
  const otherOption = question.options.find(
    (option) => option.allowOtherText && selected.includes(option.id),
  );

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role={multiple ? 'group' : 'radiogroup'}
      hint={hint ? t(hint.key, { min: hint.min ?? 0, max: hint.max ?? 0 }) : undefined}
      onClear={!multiple && !question.required && value ? () => onChange(undefined) : undefined}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className="relative block">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={ids.input}
                className="peer sr-only"
                value={option.id}
                checked={checked}
                onChange={(event) => {
                  if (multiple) {
                    const next = toggleMultiOption(
                      selected,
                      option.id,
                      event.target.checked,
                      question.options,
                    );
                    onChange(buildChoiceAnswer(next, question.options, otherText));
                  } else {
                    onChange(
                      buildChoiceAnswer(
                        [option.id],
                        question.options,
                        option.allowOtherText ? otherText : undefined,
                      ),
                    );
                  }
                }}
              />
              <span className={`${TILE} ${styles.tile}`}>
                <span>{localize(option.label, locale)}</span>
                {checked ? <Check aria-hidden="true" className="h-5 w-5 shrink-0" /> : null}
              </span>
            </label>
          );
        })}
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

'use client';

import { localize } from '@/lib/surveys/engine';
import QuestionShell from './QuestionShell';
import { buildChoiceAnswer, selectedOptionIds } from './choice-utils';
import { NotApplicableOptions } from './RatingShared';
import type { ControlProps, QuestionOfType } from './types';
import { questionDomIds } from './types';
import styles from './RatingTiles.module.css';

const SMILEYS = ['😞', '🙁', '😐', '🙂', '😄'] as const;
const NEUTRAL_LABELS: Record<string, string> = {
  'en-US': 'Neutral',
  'pt-PT': 'Neutro',
  'es-ES': 'Neutral',
  'fr-FR': 'Neutre',
  'de-DE': 'Neutral',
};

function smileyFor(value: number | undefined, index: number, total: number): string {
  if (value !== undefined && Number.isInteger(value) && value >= 1 && value <= SMILEYS.length) {
    return SMILEYS[value - 1];
  }
  if (total <= 1) return SMILEYS[2];
  return SMILEYS[Math.round((index / (total - 1)) * (SMILEYS.length - 1))];
}

const TILE =
  'flex h-full min-h-20 cursor-pointer flex-col items-center justify-start gap-1 rounded-box border border-base-300 bg-base-100 px-1 py-2 text-center text-sm transition-colors peer-checked:border-2 peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary';

/**
 * Emoji scale. Every face is paired with its visible, localized label (never emoji-only); the
 * emoji is decorative (`aria-hidden`).
 */
export default function Smileys({
  question,
  locale,
  value,
  onChange,
  error,
}: ControlProps<QuestionOfType<'smileys'>>) {
  const ids = questionDomIds(question.id);
  const scale = question.options.filter((option) => !option.notApplicable);
  const naOptions = question.options.filter((option) => option.notApplicable);
  const selectedId = selectedOptionIds(value)[0];
  const select = (optionId: string) => onChange(buildChoiceAnswer([optionId], question.options));

  return (
    <QuestionShell
      question={question}
      locale={locale}
      error={error}
      role="radiogroup"
      onClear={!question.required && value ? () => onChange(undefined) : undefined}
    >
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.max(scale.length, 1)}, minmax(0, 1fr))` }}
      >
        {scale.map((option, index) => (
          <label key={option.id} className="relative block">
            <input
              type="radio"
              name={ids.input}
              className="peer sr-only"
              value={option.id}
              aria-label={localize(option.label, locale)}
              checked={selectedId === option.id}
              onChange={() => select(option.id)}
            />
            <span className={`${TILE} ${styles.tile}`}>
              <span aria-hidden="true" className="text-3xl leading-none">
                {smileyFor(option.value, index, scale.length)}
              </span>
              <span>
                {(question.dimension === 'checkout_ease' ||
                  question.dimension === 'idea_generation_ease') &&
                option.value === 3
                  ? (NEUTRAL_LABELS[locale] ?? localize(option.label, locale))
                  : localize(option.label, locale)}
              </span>
            </span>
          </label>
        ))}
      </div>
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

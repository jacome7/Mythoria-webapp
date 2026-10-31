'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { localize } from '@/lib/surveys/engine';
import type { SurveyOption } from '@/lib/surveys/definition-schema';
import styles from './RatingTiles.module.css';

const NA_TILE =
  'flex min-h-12 cursor-pointer items-center gap-2 rounded-box border border-base-300 bg-base-100 px-4 py-2 text-base transition-colors peer-checked:border-2 peer-checked:border-primary peer-checked:bg-primary/10 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary';

/**
 * Explicit "not applicable / prefer not to say" answers for ratings. They live in the same radio
 * group as the scale (arrow keys reach them) but are presented as separate, labelled tiles.
 */
export function NotApplicableOptions({
  options,
  name,
  selectedId,
  locale,
  onSelect,
}: {
  options: SurveyOption[];
  name: string;
  selectedId: string | undefined;
  locale: string;
  onSelect: (optionId: string) => void;
}) {
  const t = useTranslations('Survey.rating');
  if (options.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-base-content/70">{t('otherAnswers')}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = selectedId === option.id;
          return (
            <label key={option.id} className="relative block">
              <input
                type="radio"
                name={name}
                className="peer sr-only"
                value={option.id}
                checked={checked}
                onChange={() => onSelect(option.id)}
              />
              <span className={`${NA_TILE} ${styles.tile}`}>
                {checked ? <Check aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
                {localize(option.label, locale)}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { localize } from '@/lib/surveys/engine';
import type { SurveyQuestion } from '@/lib/surveys/definition-schema';
import { questionDomIds } from './types';

interface QuestionShellProps {
  question: SurveyQuestion;
  locale: string;
  error?: string;
  /** Visible hint under the label (e.g. "Pick up to 3"). */
  hint?: string;
  /** Render a `<label for>` instead of a fieldset+legend (single text/number/select inputs). */
  inputId?: string;
  role?: 'radiogroup' | 'group';
  /** Show a "Clear my answer" action. */
  onClear?: () => void;
  /** Optional content to align with the optional indicator below the control. */
  footer?: ReactNode;
  children: ReactNode;
}

function isOptional(question: SurveyQuestion): boolean {
  return question.type !== 'static_content' && !question.required;
}

/** Label, help text, hint and inline error wrapper shared by every answerable control. */
export default function QuestionShell({
  question,
  locale,
  error,
  hint,
  inputId,
  role,
  onClear,
  footer,
  children,
}: QuestionShellProps) {
  const t = useTranslations('Survey.question');
  const ids = questionDomIds(question.id);
  const optional = isOptional(question);
  const rawHelp = question.help ? localize(question.help, locale) : null;
  const optionalText = t('optional');
  const prefix = rawHelp?.slice(0, optionalText.length);
  const suffix = rawHelp?.slice(optionalText.length) ?? '';
  const help =
    optional &&
    prefix?.toLocaleLowerCase() === optionalText.toLocaleLowerCase() &&
    /^(?:[.!:]\s*|\s+|$)/.test(suffix)
      ? suffix.replace(/^(?:[.!:]\s*|\s+)/, '')
      : rawHelp;
  const describedBy =
    [
      rawHelp ? ids.help : null,
      hint ? ids.hint : null,
      optional ? ids.optional : null,
      error ? ids.error : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

  const labelContent = localize(question.label, locale);

  const body = (
    <>
      {rawHelp ? (
        <p id={ids.help} className={help ? 'mb-2 text-sm text-base-content/70' : 'sr-only'}>
          {help}
        </p>
      ) : null}
      {hint ? (
        <p id={ids.hint} className="mb-2 text-sm text-base-content/70">
          {hint}
        </p>
      ) : null}
      {children}
      {footer ? (
        <div className="mt-1 flex items-baseline justify-between gap-3 text-xs text-base-content/70">
          {optional ? <span id={ids.optional}>{optionalText}</span> : <span />}
          {footer}
        </div>
      ) : optional ? (
        <p id={ids.optional} className="mt-2 text-sm text-base-content/70">
          {optionalText}
        </p>
      ) : null}
      {onClear ? (
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={onClear}>
          {t('clear')}
        </button>
      ) : null}
      {error ? (
        <p
          id={ids.error}
          role="alert"
          className="mt-2 flex items-start gap-2 text-sm font-medium text-error"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="sr-only">{t('errorPrefix')} </span>
            {error}
          </span>
        </p>
      ) : null}
    </>
  );

  if (inputId) {
    return (
      <div className="w-full" data-question-id={question.id}>
        <label htmlFor={inputId} id={ids.label} className="mb-1 block text-lg font-semibold">
          {labelContent}
        </label>
        {body}
      </div>
    );
  }

  return (
    <fieldset
      className="w-full min-w-0"
      data-question-id={question.id}
      role={role}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      aria-required={role === 'radiogroup' && !isOptional(question) ? true : undefined}
    >
      <legend id={ids.label} className="mb-1 text-lg font-semibold">
        {labelContent}
      </legend>
      {body}
    </fieldset>
  );
}

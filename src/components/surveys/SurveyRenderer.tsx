'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Clock3, Gift, Send } from 'lucide-react';
import {
  answersSchema,
  isAnswerable,
  isSingleSelect,
  type AnswerValue,
  type SurveyAnswers,
  type SurveyDefinition,
  type SurveyQuestion,
} from '@/lib/surveys/definition-schema';
import {
  getProgress,
  getScreens,
  localize,
  pruneHiddenAnswers,
  validateAnswer,
  validateSubmission,
  type SurveyAnswerError,
  type SurveyAnswerErrorCode,
  type SurveyScreen,
} from '@/lib/surveys/engine';
import { trackEvent } from '@/lib/analytics';
import { redactedPageParams } from '@/lib/analytics/page-context';
import QuestionControl from './controls/QuestionControl';

// Published survey definitions are immutable. Hide only their known duplicate timing sentences.
const duplicateTimingSentences: Record<string, string[]> = {
  'en-US': [
    'This survey takes about 3 minutes.',
    'This survey takes about 2–3 minutes.',
    'It takes about 5 minutes.',
  ],
  'pt-PT': [
    'Este questionário demora cerca de 3 minutos.',
    'Este questionário demora cerca de 2–3 minutos.',
    'Demora cerca de 5 minutos.',
  ],
  'es-ES': [
    'Esta encuesta dura unos 3 minutos.',
    'Este cuestionario lleva unos 2–3 minutos.',
    'Lleva unos 5 minutos.',
  ],
  'fr-FR': [
    'Ce questionnaire dure environ 3 minutes.',
    'Ce questionnaire dure environ 2 à 3 minutes.',
    'Il dure environ 5 minutes.',
  ],
  'de-DE': [
    'Die Umfrage dauert etwa 3 Minuten.',
    'Die Umfrage dauert etwa 2–3 Minuten.',
    'Sie dauert etwa 5 Minuten.',
  ],
};

export interface SurveyRendererProps {
  token: string;
  definition: SurveyDefinition;
  surveyId: string;
  version: number;
  cohortKey: string;
  initialAnswers: SurveyAnswers;
  initialStatus: 'not_started' | 'opened' | 'started';
}

type Phase = 'intro' | 'questions' | 'complete';

interface SubmitOutcome {
  entitlementId: string | null;
  rewardStatus: string | null;
}

const DRAFT_KEY_PREFIX = 'mythoria_survey_draft:';
const SUBMISSION_KEY_PREFIX = 'mythoria_survey_submission:';

// ---------------------------------------------------------------------------------------------
// Browser storage helpers. Storage can be unavailable (private mode, blocked cookies): every
// access is wrapped so the survey keeps working without it.
// ---------------------------------------------------------------------------------------------

function readLocalDraft(token: string): SurveyAnswers | null {
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${token}`);
    if (!raw) return null;
    const parsed = answersSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(token: string, answers: SurveyAnswers): void {
  try {
    window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${token}`, JSON.stringify(answers));
  } catch {
    // Storage unavailable or full: the server-side autosave remains the source of truth.
  }
}

function clearLocalDraft(token: string): void {
  try {
    window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${token}`);
    window.sessionStorage.removeItem(`${SUBMISSION_KEY_PREFIX}${token}`);
  } catch {
    // ignore
  }
}

function newUuid(): string {
  const cryptoApi = typeof globalThis.crypto !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

/** Stable per-session Idempotency-Key, so a retry after a network error reuses the same key. */
function getSubmissionKey(token: string, cache: { current: string | null }): string {
  if (cache.current) return cache.current;
  let key: string | null = null;
  try {
    key = window.sessionStorage.getItem(`${SUBMISSION_KEY_PREFIX}${token}`);
  } catch {
    key = null;
  }
  if (!key) {
    key = newUuid();
    try {
      window.sessionStorage.setItem(`${SUBMISSION_KEY_PREFIX}${token}`, key);
    } catch {
      // ignore: the in-memory ref still keeps the key stable for this page view
    }
  }
  cache.current = key;
  return key;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function answerOptionIds(answer: AnswerValue | undefined): string | undefined {
  if (!answer) return undefined;
  if (answer.kind === 'choice') return answer.optionIds.join(',');
  if (answer.kind === 'na') return answer.optionId;
  return undefined;
}

function screenQuestionIds(screen: SurveyScreen): string[] {
  return screen.questions.filter(isAnswerable).map((q) => q.id);
}

export default function SurveyRenderer({
  token,
  definition,
  surveyId,
  version,
  cohortKey,
  initialAnswers,
  initialStatus,
}: SurveyRendererProps) {
  const t = useTranslations('Survey');
  const locale = useLocale();
  const apiBase = `/api/surveys/${encodeURIComponent(token)}`;

  const [phase, setPhase] = useState<Phase>('intro');
  const [screenIndex, setScreenIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, SurveyAnswerError>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const [restored, setRestored] = useState(false);

  const submissionKeyRef = useRef<string | null>(null);
  const openedTracked = useRef(false);
  const startedTracked = useRef(initialStatus === 'started');
  const answeredTracked = useRef(new Set<string>());
  const pendingFocus = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const hasInitialDraft = Object.keys(initialAnswers).length > 0;

  const analyticsBase = useCallback(
    () => ({
      survey_id: surveyId,
      survey_version: version,
      cohort: cohortKey,
      // The real URL carries the bearer token: GA4 must never derive page_location from it.
      ...redactedPageParams(`/${locale}/survey/:token`),
    }),
    [surveyId, version, cohortKey, locale],
  );

  // survey_opened + invitation `opened` marker (once per page view).
  useEffect(() => {
    if (openedTracked.current) return;
    openedTracked.current = true;
    trackEvent('survey_opened', analyticsBase());
    if (initialStatus === 'not_started') {
      void postJson(`${apiBase}/progress`, { event: 'opened' }).catch(() => undefined);
    }
  }, [analyticsBase, apiBase, initialStatus]);

  // localStorage fallback: only when the server has no draft for this invitation.
  useEffect(() => {
    if (hasInitialDraft) return;
    const local = readLocalDraft(token);
    if (local && Object.keys(local).length > 0) {
      setAnswers(pruneHiddenAnswers(definition, local));
      setRestored(true);
    }
  }, [token, definition, hasInitialDraft]);

  // Keep the local draft current while answering.
  useEffect(() => {
    if (phase === 'questions') writeLocalDraft(token, answers);
  }, [answers, phase, token]);

  const screens = getScreens(definition, answers);
  const safeIndex = Math.min(screenIndex, Math.max(screens.length - 1, 0));
  const screen: SurveyScreen | undefined = screens[safeIndex];
  const isLastScreen = safeIndex >= screens.length - 1;
  const progress = getProgress(definition, answers, safeIndex);

  // Move focus to the screen heading when the screen changes (keyboard / screen reader users).
  useEffect(() => {
    if (phase !== 'intro') headingRef.current?.focus();
  }, [phase, safeIndex]);

  // After a failed validation, focus the first control with an error.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const container = document.querySelector(`[data-question-id="${CSS.escape(target)}"]`);
    const control = container?.querySelector<HTMLElement>('input, textarea, select, button');
    control?.focus();
    container?.scrollIntoView?.({ block: 'center' });
  }, [errors]);

  const messageFor = useCallback(
    (error: SurveyAnswerError): string =>
      t(`errors.${error.code}`, { min: 0, max: 0, step: 0, ...(error.params ?? {}) }),
    [t],
  );

  const errorTexts: Record<string, string> = {};
  for (const [id, error] of Object.entries(errors)) errorTexts[id] = messageFor(error);

  const handleChange = (question: SurveyQuestion, value: AnswerValue | undefined) => {
    if (!isAnswerable(question)) return;
    const draft: SurveyAnswers = { ...answers };
    if (value) draft[question.id] = value;
    else delete draft[question.id];
    // Changing an answer can hide later questions: drop their stale answers right away.
    const next = pruneHiddenAnswers(definition, draft);
    setAnswers(next);
    setSubmitError(null);

    setErrors((previous) => {
      const cleaned: Record<string, SurveyAnswerError> = {};
      for (const [id, error] of Object.entries(previous)) {
        if (id in next || id === question.id) cleaned[id] = error;
      }
      if (cleaned[question.id]) {
        const recheck = validateAnswer(question, next[question.id]);
        if (recheck) cleaned[question.id] = recheck;
        else delete cleaned[question.id];
      }
      return cleaned;
    });
    const singleChoice = isSingleSelect(question) && value?.kind === 'choice';
    const selectedOption =
      singleChoice && 'options' in question && value.optionIds.length === 1
        ? question.options.find((option) => option.id === value.optionIds[0])
        : undefined;
    const nextScreens = getScreens(definition, next);
    const currentNextIndex = nextScreens.findIndex((candidate) =>
      candidate.questions.some((item) => item.id === question.id),
    );
    if (
      singleChoice &&
      selectedOption &&
      !selectedOption.allowOtherText &&
      screen &&
      screen.questions.filter(isAnswerable).length === 1 &&
      currentNextIndex >= 0 &&
      currentNextIndex < nextScreens.length - 1 &&
      !submitting &&
      !validateAnswer(question, next[question.id])
    ) {
      setErrors({});
      trackAnswered(screen, next);
      void postJson(`${apiBase}/progress`, { answers: next }).catch(() => undefined);
      setScreenIndex(currentNextIndex + 1);
    }
  };

  const startSurvey = () => {
    if (!startedTracked.current) {
      startedTracked.current = true;
      trackEvent('survey_started', analyticsBase());
    }
    void postJson(`${apiBase}/progress`, { answers }).catch(() => undefined);
    setScreenIndex(0);
    setPhase('questions');
  };

  const trackAnswered = (target: SurveyScreen, currentAnswers = answers) => {
    for (const question of target.questions) {
      if (!isAnswerable(question)) continue;
      const answer = currentAnswers[question.id];
      if (!answer || answeredTracked.current.has(question.id)) continue;
      answeredTracked.current.add(question.id);
      const optionIds = answerOptionIds(answer);
      trackEvent('survey_question_answered', {
        ...analyticsBase(),
        question_id: question.id,
        ...(optionIds ? { option_ids: optionIds } : {}),
      });
    }
  };

  const validateScreen = (target: SurveyScreen): Record<string, SurveyAnswerError> => {
    const found: Record<string, SurveyAnswerError> = {};
    for (const question of target.questions) {
      if (!isAnswerable(question)) continue;
      const error = validateAnswer(question, answers[question.id]);
      if (error) found[question.id] = error;
    }
    return found;
  };

  const showErrors = (found: Record<string, SurveyAnswerError>, focusId: string | undefined) => {
    pendingFocus.current = focusId ?? null;
    setErrors(found);
  };

  const errorsFromCodes = (
    codes: Record<string, SurveyAnswerErrorCode>,
  ): Record<string, SurveyAnswerError> => {
    const found: Record<string, SurveyAnswerError> = {};
    for (const [id, code] of Object.entries(codes)) {
      const question = definition.questions.find((q) => q.id === id);
      // Recompute locally to recover parameters such as {min}/{max}; fall back to the bare code.
      const detailed =
        question && isAnswerable(question) ? validateAnswer(question, answers[id]) : null;
      found[id] = detailed ?? { code };
    }
    return found;
  };

  const submit = async () => {
    const validation = validateSubmission(definition, answers);
    if (!validation.ok) {
      const found = errorsFromCodes(validation.errors);
      const firstId = Object.keys(found)[0];
      const targetIndex = screens.findIndex((s) => screenQuestionIds(s).includes(firstId));
      if (targetIndex >= 0) setScreenIndex(targetIndex);
      setSubmitError(t('errors.fixAnswers'));
      showErrors(found, firstId);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await postJson(
        `${apiBase}/submit`,
        { answers: validation.answers },
        { 'Idempotency-Key': getSubmissionKey(token, submissionKeyRef) },
      );
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        errors?: Record<string, SurveyAnswerErrorCode>;
        entitlementId?: string | null;
        rewardStatus?: string | null;
      } | null;

      if (response.ok && data?.ok) {
        trackEvent('survey_submitted', {
          ...analyticsBase(),
          questions_answered: Object.keys(validation.answers).length,
          reward_eligible: definition.rewardEligible === true,
        });
        clearLocalDraft(token);
        setOutcome({
          entitlementId: data.entitlementId ?? null,
          rewardStatus: data.rewardStatus ?? null,
        });
        setPhase('complete');
        return;
      }
      if (response.status === 422 && data?.errors) {
        const found = errorsFromCodes(data.errors);
        const firstId = Object.keys(found)[0];
        const targetIndex = screens.findIndex((s) => screenQuestionIds(s).includes(firstId));
        if (targetIndex >= 0) setScreenIndex(targetIndex);
        setSubmitError(t('errors.fixAnswers'));
        showErrors(found, firstId);
        return;
      }
      setSubmitError(response.status === 409 ? t('errors.closed') : t('errors.submitFailed'));
    } catch {
      setSubmitError(t('errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitScreen = (event: FormEvent) => {
    event.preventDefault();
    if (!screen || submitting) return;
    const found = validateScreen(screen);
    if (Object.keys(found).length > 0) {
      showErrors(found, Object.keys(found)[0]);
      return;
    }
    setErrors({});
    trackAnswered(screen);
    // Autosave on Next (fire and forget; the local draft is the fallback).
    void postJson(`${apiBase}/progress`, {
      answers: pruneHiddenAnswers(definition, answers),
    }).catch(() => undefined);
    if (isLastScreen) {
      void submit();
    } else {
      setScreenIndex(safeIndex + 1);
    }
  };

  const handleBack = () => {
    setErrors({});
    setSubmitError(null);
    if (safeIndex === 0) {
      setPhase('intro');
    } else {
      setScreenIndex(safeIndex - 1);
    }
  };

  const title = localize(definition.title, locale);

  // -------------------------------------------------------------------------------------------
  // Intro
  // -------------------------------------------------------------------------------------------
  if (phase === 'intro') {
    const intro =
      definition.intro && !(definition.id === 'paying_creator' && definition.version === 1)
        ? (duplicateTimingSentences[locale] ?? []).reduce(
            (text, sentence) => text.replace(sentence, '').replace(/ {2,}/g, ' ').trim(),
            localize(definition.intro, locale),
          )
        : null;
    const resuming = initialStatus === 'started' || restored || hasInitialDraft;
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="rounded-box border border-base-300 bg-base-100 p-6 shadow-sm sm:p-8">
          <Image
            src="/Papercut_icons/fa-clipboard-list-papercut.webp"
            alt=""
            width={256}
            height={337}
            className="mx-auto mb-4 h-auto w-24 sm:w-28"
          />
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-center text-3xl font-bold text-primary outline-none"
          >
            {title}
          </h1>
          <p className="mt-3 text-lg text-base-content/80">
            {localize(definition.description, locale)}
          </p>
          {intro ? <p className="mt-3 whitespace-pre-line text-base">{intro}</p> : null}
          {definition.rewardEligible ? (
            <section
              aria-labelledby="survey-intro-reward-title"
              className="mt-5 flex items-start gap-3 rounded-box border border-primary/30 bg-primary/10 p-4"
            >
              <Gift aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
              <div>
                <h2 id="survey-intro-reward-title" className="font-bold text-primary">
                  {t('intro.rewardTitle')}
                </h2>
                <p className="mt-1 text-sm sm:text-base">{t('intro.rewardBody')}</p>
              </div>
            </section>
          ) : null}
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
            {t('intro.estimatedMinutes', { minutes: definition.estimatedMinutes })}
          </p>
          <p className="mt-3 text-sm text-base-content/70">
            {t.rich('intro.privacy', {
              link: (chunks) => (
                <a
                  href={`/${locale}/privacy-policy`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-hover font-semibold text-primary underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
          {resuming ? (
            <p className="mt-4 rounded-box bg-base-200 p-3 text-sm" role="status">
              {t('intro.restored')}
            </p>
          ) : null}
          <div className="mt-6">
            <button
              type="button"
              className="btn btn-primary h-auto min-h-12 max-w-full text-sm sm:text-base"
              onClick={startSurvey}
            >
              {resuming ? t('intro.resume') : t('intro.start')}
              <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------------------------
  // Completion
  // -------------------------------------------------------------------------------------------
  if (phase === 'complete') {
    const pending = outcome?.rewardStatus === 'pending_story';
    const defaultTitle = t('completion.title');
    const message = localize(definition.completionMessage, locale);
    const titlePrefix = defaultTitle.replace(/[\s.!?¡¿]+$/u, '');
    const startsWithThanks = message
      .toLocaleLowerCase()
      .startsWith(titlePrefix.toLocaleLowerCase());
    const firstSentence = startsWithThanks
      ? message.match(/^(.+?[.!?])(?:\s+|$)([\s\S]*)$/u)
      : null;
    const completionTitle = firstSentence?.[1] ?? defaultTitle;
    const completionMessage = firstSentence ? firstSentence[2] : message;
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="rounded-box border border-base-300 bg-base-100 px-6 py-8 text-center shadow-sm sm:px-12 sm:py-10">
          <Image
            src="/Papercut_icons/open-book-with-stars.webp"
            alt=""
            width={512}
            height={247}
            className="mx-auto mb-4 h-auto w-full max-w-64"
          />
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl font-bold text-primary outline-none sm:text-4xl"
          >
            {completionTitle}
          </h1>
          {completionMessage ? (
            <p className="mt-3 whitespace-pre-line text-lg">{completionMessage}</p>
          ) : null}
          {outcome?.entitlementId ? (
            <section
              className="mt-6 rounded-box border border-primary/40 bg-primary/5 p-4 text-left"
              aria-labelledby="survey-reward-title"
            >
              <h2
                id="survey-reward-title"
                className="flex items-center gap-2 text-xl font-semibold"
              >
                <Gift aria-hidden="true" className="h-5 w-5" />
                {t('completion.rewardTitle')}
              </h2>
              <p className="mt-2 text-base">
                {pending ? t('completion.rewardPending') : t('completion.rewardEligible')}
              </p>
              <a
                href={`/${locale}/survey/reward/${outcome.entitlementId}`}
                className="btn btn-primary mt-4"
              >
                {pending ? t('completion.rewardCtaPending') : t('completion.rewardCta')}
              </a>
            </section>
          ) : null}
          <div className="mt-6">
            <a href={`/${locale}`} className="btn btn-primary">
              {t('completion.backHome')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------------------------
  // Questions
  // -------------------------------------------------------------------------------------------
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <p className="mb-2 text-center text-xl font-bold text-primary">{title}</p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-base-content/70">
          <span aria-hidden="true" />
          <span className="font-bold text-base-content">
            {t('nav.stepProgress', { current: progress.current, total: progress.total })}
          </span>
          <span aria-hidden="true" className="text-right">
            {progress.percent}%
          </span>
        </div>
        <progress
          className="progress progress-primary mt-1 w-full"
          value={progress.current}
          max={Math.max(progress.total, 1)}
          aria-label={t('nav.progressLabel')}
        />
      </div>

      <form noValidate onSubmit={handleSubmitScreen} className="flex flex-col gap-8">
        <h1 ref={headingRef} tabIndex={-1} className="sr-only">
          {title}
        </h1>
        {screen?.questions.map((question) => (
          <QuestionControl
            key={question.id}
            question={question}
            locale={locale}
            value={isAnswerable(question) ? answers[question.id] : undefined}
            onChange={handleChange}
            error={errorTexts[question.id]}
          />
        ))}

        {submitError ? (
          <p role="alert" className="rounded-box border border-error/40 bg-error/10 p-3 text-sm">
            {submitError}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleBack}
            disabled={submitting}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            {t('nav.back')}
          </button>
          <button type="submit" className="btn btn-primary min-w-36" disabled={submitting}>
            {isLastScreen ? (
              <>
                {submitting ? t('nav.submitting') : t('nav.submit')}
                <Send aria-hidden="true" className="h-4 w-4" />
              </>
            ) : (
              <>
                {t('nav.next')}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

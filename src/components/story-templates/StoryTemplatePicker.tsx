'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';
import type { StoryTemplate } from '@/types/story-template';
import {
  createTemplateJourney,
  fallbackQuestion,
  guideQuestionSchema,
  STORY_GUIDE_LIMIT,
  confirmedQuestionPhotoSchema,
  type QuestionPhoto,
  type StoryTemplateJourney,
} from '@/lib/story-templates/journey';
import { trackEvent } from '@/lib/analytics';
import { firstPreviewQuestion } from '@/lib/story-templates/guided-preview';
import QuestionPhotoAnswer from './QuestionPhotoAnswer';

interface Props {
  templates: StoryTemplate[];
  journey: StoryTemplateJourney | null;
  onChange: (journey: StoryTemplateJourney | null) => void;
  onFreeform: () => void;
  contribution: string;
  disabled?: boolean;
  incomingTemplateId?: string | null;
  compactCatalog?: boolean;
  onChooseTemplate?: (journey: StoryTemplateJourney) => void;
  simplified?: boolean;
  needsMemoryContribution?: boolean;
  externalImageCount?: number;
}

export default function StoryTemplatePicker({
  templates,
  journey,
  onChange,
  onFreeform,
  contribution,
  disabled,
  incomingTemplateId,
  compactCatalog = false,
  onChooseTemplate,
  simplified = false,
  needsMemoryContribution = false,
  externalImageCount = 0,
}: Props) {
  const t = useTranslations('StoryTemplates');
  const tAudience = useTranslations('GetInspiredPage.targetAudience');
  const tNovel = useTranslations('GetInspiredPage.novelStyle');
  const tArt = useTranslations('GraphicalStyles');
  const locale = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<StoryTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [choice, setChoice] = useState('');
  const [custom, setCustom] = useState('');
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const incomingOffered = useRef(false);
  const template = templates.find((item) => item.id === journey?.templateId);
  const question = journey?.question;
  const latestJourney = useRef(journey);
  useLayoutEffect(() => {
    latestJourney.current = journey;
  }, [journey]);
  const commit = (next: StoryTemplateJourney) => {
    latestJourney.current = next;
    onChange(next);
  };
  const draftPhoto =
    journey?.answerDraft?.questionId === question?.id ? journey?.answerDraft?.photo : undefined;
  const photoReady = draftPhoto && confirmedQuestionPhotoSchema.safeParse(draftPhoto).success;
  const photoAllowed = simplified && question?.photoTarget === 'protagonist';
  const hasConfirmedPhoto = !!journey?.answers.some((answer) => answer.photo);
  const updateDraft = (text: string, photo?: QuestionPhoto) => {
    const current = latestJourney.current;
    if (!current || current.question?.id !== question?.id || disabled) return;
    commit({ ...current, answerDraft: { questionId: question!.id, text, photo } });
  };

  useEffect(() => {
    const current = latestJourney.current;
    const untouchedLegacyQuestion =
      current?.question &&
      !current.question.photoTarget &&
      !current.question.id.startsWith('preview-protagonist-') &&
      !current.answerDraft?.text.trim() &&
      !current.answerDraft?.photo;
    if (
      !simplified ||
      disabled ||
      !template ||
      !current ||
      (current.question && !untouchedLegacyQuestion) ||
      current.previousQuestions.length ||
      current.answers.length ||
      current.exhausted
    )
      return;
    const next = { ...current, question: firstPreviewQuestion(template, current.mode, locale) };
    latestJourney.current = next;
    onChange(next);
  }, [simplified, disabled, template, journey?.sessionId, journey?.mode, locale, onChange]);

  useEffect(() => {
    if (disabled || incomingOffered.current || !journey || !incomingTemplateId) return;
    incomingOffered.current = true;
    const incoming = templates.find((item) => item.id === incomingTemplateId);
    if (incoming && journey.templateId !== incoming.id) {
      setPicking(true);
      setPending(incoming);
    }
  }, [disabled, incomingTemplateId, journey, templates]);

  const cancelRequest = useCallback(() => {
    revision.current += 1;
    controller.current?.abort();
    setLoading(false);
  }, []);
  useEffect(
    () => () => {
      revision.current += 1;
      controller.current?.abort();
    },
    [],
  );
  useEffect(() => {
    revision.current += 1;
    controller.current?.abort();
    setLoading(false);
  }, [contribution, disabled]);
  useEffect(() => {
    const draft = latestJourney.current?.answerDraft;
    setChoice(
      question?.customOnly || draft?.questionId === question?.id
        ? 'custom'
        : (question?.suggestedChoiceId ?? ''),
    );
    setCustom(draft?.questionId === question?.id ? (draft?.text ?? '') : '');
    if (question && (!simplified || latestJourney.current?.previousQuestions.length))
      questionHeading.current?.focus();
  }, [question, simplified]);

  const select = (next: StoryTemplate) => {
    cancelRequest();
    (onChooseTemplate ?? onChange)(createTemplateJourney(next));
    setPending(null);
    setPicking(false);
    setUsedFallback(false);
    trackEvent('story_template_selected', {
      template_id: next.id,
      template_mode: next.defaultMode,
    });
  };
  const patch = (values: Partial<StoryTemplateJourney>) => {
    if (!journey) return;
    cancelRequest();
    commit({ ...journey, ...values });
  };
  const ask = useCallback(
    async (snapshot: StoryTemplateJourney) => {
      if (!template || snapshot.requests >= STORY_GUIDE_LIMIT || snapshot.exhausted || disabled)
        return;
      cancelRequest();
      const requestRevision = ++revision.current;
      const abort = new AbortController();
      controller.current = abort;
      const next = { ...snapshot, requests: snapshot.requests + 1, question: null };
      onChange(next);
      setLoading(true);
      const started = Date.now();
      const timer = window.setTimeout(() => abort.abort(), 12_000);
      try {
        const response = await fetch('/api/story-guide/next-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abort.signal,
          body: JSON.stringify({
            templateId: template.id,
            templateVersion: template.version,
            guideSessionId: next.sessionId,
            revision: requestRevision,
            locale,
            mode: next.mode,
            answers: next.answers
              .filter((item) => item.answer.trim())
              .map((item) => ({
                questionId: item.questionId,
                question: item.question,
                answer: [
                  item.answer,
                  item.photo?.metadata?.characters?.[item.photo.sourceCharacterIndex]
                    ?.physicalDescription
                    ? `Photographed protagonist appearance only (not biography): ${item.photo.metadata.characters[item.photo.sourceCharacterIndex].physicalDescription}`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n')
                  .slice(0, 1500),
              })),
            previousQuestions: next.previousQuestions,
            preferences: next.preferences,
            premise: next.premise,
            contribution,
            ...(simplified ? { photoAnswers: true } : {}),
          }),
        });
        if (!response.ok) throw new Error('Guide unavailable');
        const result = await response.json();
        if (requestRevision !== revision.current) return;
        if (result.revision !== requestRevision) throw new Error('Stale guide response');
        const parsed = result.question === null ? null : guideQuestionSchema.parse(result.question);
        if (parsed && next.previousQuestions.includes(parsed.text))
          throw new Error('Repeated question');
        onChange({ ...next, question: parsed, exhausted: parsed === null });
        setUsedFallback(result.source === 'fallback');
        trackEvent('story_guide_question', {
          template_id: template.id,
          question_depth: next.requests,
          guide_source: result.source === 'fallback' ? 'fallback' : 'ai',
          latency_ms: Date.now() - started,
        });
      } catch {
        if (requestRevision !== revision.current) return;
        const fallback = fallbackQuestion(template, next.previousQuestions, next.mode === 'memory');
        onChange({ ...next, question: fallback, exhausted: fallback === null });
        setUsedFallback(true);
        trackEvent('story_guide_question', {
          template_id: template.id,
          question_depth: next.requests,
          guide_source: 'fallback',
          latency_ms: Date.now() - started,
        });
      } finally {
        window.clearTimeout(timer);
        if (requestRevision === revision.current) setLoading(false);
      }
    },
    [template, disabled, cancelRequest, onChange, locale, contribution, simplified],
  );
  const answer = (skip: boolean) => {
    if (!journey || !question) return;
    const value =
      choice === 'custom'
        ? custom.trim() || (photoReady ? t('preview.photoOnlyAnswer') : '')
        : question.choices.find((item) => item.id === choice)?.value;
    if (!skip && (!value || (choice === 'custom' && draftPhoto && !photoReady))) return;
    const confirmedPhoto =
      !skip && choice === 'custom' && photoReady
        ? confirmedQuestionPhotoSchema.parse(draftPhoto)
        : undefined;
    const next: StoryTemplateJourney = {
      ...journey,
      question: null,
      answerDraft: undefined,
      previousQuestions: [...journey.previousQuestions, question.text],
      answers: skip
        ? journey.answers
        : [
            ...journey.answers,
            {
              questionId: question.id,
              question: question.text,
              answer: value!,
              isAuthorContribution: choice === 'custom',
              ...(confirmedPhoto ? { photo: confirmedPhoto } : {}),
            },
          ],
    };
    if (next.previousQuestions.length >= STORY_GUIDE_LIMIT) next.exhausted = true;
    commit(next);
    trackEvent('story_guide_answer', {
      template_id: template?.id,
      question_depth: next.previousQuestions.length,
      skipped: skip,
    });
    if (
      !next.exhausted &&
      next.previousQuestions.length < next.roundEnd &&
      next.requests < STORY_GUIDE_LIMIT
    )
      void ask(next);
  };

  const modeOptions = journey && template && template.modes.length > 1 && (
    <fieldset className="flex flex-wrap gap-4">
      <legend className="font-semibold mb-2">{t('modeLabel')}</legend>
      {template.modes.map((mode) => (
        <label className="flex items-center gap-2" key={mode}>
          <input
            className="radio radio-primary"
            type="radio"
            name="story-mode"
            checked={journey.mode === mode}
            onChange={() =>
              patch({
                mode,
                answers: [],
                previousQuestions: [],
                question: null,
                answerDraft: undefined,
                exhausted: false,
              })
            }
          />
          {t(mode)}
        </label>
      ))}
    </fieldset>
  );
  const answerList = journey && journey.answers.length > 0 && (
    <ul className="space-y-3" aria-label={t('summary')}>
      {journey.answers.map((item, index) => (
        <li key={`${item.questionId}-${index}`} className="rounded-xl bg-base-200/50 p-3">
          {item.photo && (
            <div className="mb-3 space-y-2">
              <p className="text-sm font-semibold">{t('photoConfirmed')}</p>
              {item.photo.publicUrl && (
                <Image
                  src={item.photo.publicUrl}
                  alt={t('photoPreview')}
                  width={160}
                  height={120}
                  unoptimized
                  className="h-auto max-h-32 w-auto max-w-full rounded-lg object-contain"
                />
              )}
            </div>
          )}
          <label className="block">
            <span className="text-sm font-semibold">{item.question}</span>
            <textarea
              className="textarea textarea-bordered w-full mt-2"
              maxLength={1500}
              value={item.answer}
              onChange={(event) =>
                patch({
                  answers: journey.answers.map((a, i) =>
                    i === index
                      ? { ...a, answer: event.target.value, isAuthorContribution: true }
                      : a,
                  ),
                  question: simplified ? journey.question : null,
                })
              }
            />
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              patch({
                answers: journey.answers.filter((_, i) => i !== index),
                question: simplified ? journey.question : null,
              })
            }
          >
            {t('removeAnswer')}
          </button>
        </li>
      ))}
    </ul>
  );
  const preferences = journey &&
    (journey.preferences.targetAudience ||
      (simplified && template && template.modes.length > 1)) && (
      <details className="rounded-xl border border-base-300 p-4">
        <summary className="cursor-pointer font-semibold">
          {t('preferences')}
          {simplified && (
            <span className="text-sm font-normal text-base-content/70"> ({t('optional')})</span>
          )}
        </summary>
        {simplified && <div className="pt-4">{modeOptions}</div>}
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          <label>
            <span className="block mb-1">{t('audience')}</span>
            <select
              className="select select-bordered w-full"
              value={journey.preferences.targetAudience ?? ''}
              onChange={(e) =>
                patch({
                  preferences: {
                    ...journey.preferences,
                    targetAudience: e.target.value as TargetAudience,
                  },
                })
              }
            >
              {Object.values(TargetAudience).map((value) => (
                <option key={value} value={value}>
                  {tAudience(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block mb-1">{t('writingStyle')}</span>
            <select
              className="select select-bordered w-full"
              value={journey.preferences.novelStyle ?? ''}
              onChange={(e) =>
                patch({
                  preferences: {
                    ...journey.preferences,
                    novelStyle: e.target.value as NovelStyle,
                  },
                })
              }
            >
              {Object.values(NovelStyle).map((value) => (
                <option key={value} value={value}>
                  {tNovel(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block mb-1">{t('artStyle')}</span>
            <select
              className="select select-bordered w-full"
              value={journey.preferences.graphicalStyle ?? ''}
              onChange={(e) =>
                patch({
                  preferences: {
                    ...journey.preferences,
                    graphicalStyle: e.target.value as GraphicalStyle,
                  },
                })
              }
            >
              {Object.values(GraphicalStyle).map((value) => (
                <option key={value} value={value}>
                  {tArt(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="block mb-1">{t('tone')}</span>
            <input
              className="input input-bordered w-full"
              maxLength={120}
              value={journey.preferences.tone ?? ''}
              onChange={(e) =>
                patch({ preferences: { ...journey.preferences, tone: e.target.value } })
              }
            />
          </label>
        </div>
      </details>
    );
  const guide = journey && template && (
    <section
      className={
        simplified ? 'space-y-4' : 'rounded-2xl border border-primary/20 p-4 sm:p-5 space-y-4'
      }
    >
      {simplified &&
        !question &&
        !loading &&
        !journey.exhausted &&
        journey.requests < STORY_GUIDE_LIMIT && (
          <p className="text-sm text-base-content/75">{t('questionsHelp')}</p>
        )}
      {loading && (
        <p role="status" className="flex items-center gap-2">
          <span className="loading loading-spinner loading-sm" />
          {t('loading')}
        </p>
      )}
      {usedFallback && (
        <p role="status" className="text-sm">
          {t('fallback')}
        </p>
      )}
      {question && !loading && (
        <>
          <h3 ref={questionHeading} tabIndex={-1} className="text-xl font-bold outline-none">
            {question.text}
          </h3>
          <fieldset className="grid gap-2">
            <legend className="sr-only">{question.text}</legend>
            {question.choices.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${choice === item.id ? 'border-primary bg-primary/5' : 'border-base-300'}`}
              >
                <input
                  type="radio"
                  className="radio radio-primary"
                  name="guide-answer"
                  checked={choice === item.id}
                  onChange={() => {
                    setChoice(item.id);
                    if (simplified && journey.answerDraft)
                      commit({ ...journey, answerDraft: undefined });
                  }}
                />
                <span>
                  {item.label}
                  {item.id === question.suggestedChoiceId && (
                    <span
                      className={
                        simplified ? 'block text-xs text-primary' : 'ml-2 text-xs text-primary'
                      }
                    >
                      {t('recommended')}
                    </span>
                  )}
                </span>
              </label>
            ))}
            {!question.customOnly && (
              <label className="flex items-center gap-3 p-3">
                <input
                  type="radio"
                  className="radio radio-primary"
                  name="guide-answer"
                  checked={choice === 'custom'}
                  onChange={() => setChoice('custom')}
                />
                <span>
                  {t('customAnswer')}
                  {photoAllowed && (
                    <span className="block text-xs text-primary">{t('customPhotoAnswer')}</span>
                  )}
                </span>
              </label>
            )}
          </fieldset>
          {choice === 'custom' && (
            <textarea
              aria-label={t('customAnswer')}
              className="textarea textarea-bordered w-full"
              maxLength={1500}
              placeholder={t(
                simplified && question.photoTarget === 'protagonist'
                  ? journey.mode === 'memory'
                    ? 'memoryCharacterPlaceholder'
                    : 'characterAnswerPlaceholder'
                  : 'customAnswerPlaceholder',
              )}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                if (simplified) updateDraft(e.target.value, draftPhoto);
              }}
            />
          )}
          {choice === 'custom' && photoAllowed && (
            <QuestionPhotoAnswer
              key={question.id}
              value={draftPhoto}
              disabled={disabled}
              unavailable={hasConfirmedPhoto || externalImageCount >= 3}
              onChange={(photo) =>
                updateDraft(latestJourney.current?.answerDraft?.text ?? custom, photo)
              }
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                !choice ||
                (choice === 'custom' &&
                  ((!custom.trim() && !photoReady) || (!!draftPhoto && !photoReady)))
              }
              onClick={() => answer(false)}
            >
              {t('questionNext')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => answer(true)}>
              {t('skip')}
            </button>
          </div>
        </>
      )}
      {!loading && !question && !journey.exhausted && journey.requests < STORY_GUIDE_LIMIT && (
        <>
          {journey.previousQuestions.length >= journey.roundEnd && <p>{t('roundComplete')}</p>}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              const next =
                journey.previousQuestions.length >= journey.roundEnd
                  ? {
                      ...journey,
                      roundEnd: Math.min(STORY_GUIDE_LIMIT, journey.roundEnd + 3),
                    }
                  : journey;
              void ask(next);
            }}
          >
            {journey.requests === 0 ? t(simplified ? 'answerQuestions' : 'personalize') : t('more')}
          </button>
        </>
      )}
      {!loading && !question && (journey.exhausted || journey.requests >= STORY_GUIDE_LIMIT) && (
        <p>{t('guideComplete')}</p>
      )}
    </section>
  );

  return (
    <fieldset disabled={disabled} className="space-y-6 min-w-0" aria-label={t('selectorTitle')}>
      {(!journey || picking) && (
        <section className="space-y-4">
          {!compactCatalog && (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-primary">{t('selectorTitle')}</h2>
                <p className="mt-2 text-base-content/75">{t('selectorDescription')}</p>
              </div>
              <button type="button" className="btn btn-outline" onClick={onFreeform}>
                {t('mine')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(showAll ? templates : templates.slice(0, 3)).map((item) => (
              <button
                type="button"
                key={item.id}
                className="card flex-row sm:flex-col border border-primary/15 bg-base-100 text-left shadow-sm overflow-hidden hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                onClick={() => (journey && !onChooseTemplate ? setPending(item) : select(item))}
              >
                <div className="relative w-24 shrink-0 self-stretch sm:aspect-[4/3] sm:w-full">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width:639px) 96px, 280px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 p-3 sm:p-4 space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-primary">{item.title}</h3>
                  <p className="text-sm leading-relaxed">{item.description}</p>
                  <span className="inline-block pt-2 text-primary font-semibold">
                    {t('choose')} →
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!showAll && (
            <button type="button" className="btn btn-ghost" onClick={() => setShowAll(true)}>
              {t('browse')}
            </button>
          )}
          {picking && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setPicking(false);
                setPending(null);
              }}
            >
              {t('back')}
            </button>
          )}
          {pending && (
            <section
              role="region"
              aria-label={t('previewReplacement')}
              className="rounded-2xl border border-primary/30 p-5 space-y-3"
            >
              <h3 className="font-bold">{t('changeTitle')}</h3>
              <p>{t('changeDescription')}</p>
              <p className="font-semibold">{pending.title}</p>
              <p>{pending.premise}</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn btn-primary" onClick={() => select(pending)}>
                  {t('confirmChange')}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>
                  {t('cancel')}
                </button>
              </div>
            </section>
          )}
        </section>
      )}
      {journey && !picking && (
        <section className="space-y-5">
          {simplified ? (
            <div className="space-y-1">
              <p className="text-sm text-base-content/70">{t('selectedModel')}</p>
              <h2 className="text-xl font-bold text-primary">{template?.title ?? t('summary')}</h2>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold text-primary">{template?.title ?? t('summary')}</h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  cancelRequest();
                  setPicking(true);
                }}
              >
                {t('browse')}
              </button>
            </div>
          )}
          {!simplified && modeOptions}
          {!simplified && journey.mode === 'memory' && (
            <p className="rounded-xl bg-primary/5 p-3 text-sm">{t('modeHelp')}</p>
          )}
          <label className="block">
            <span className="block font-semibold mb-2">{t('summary')}</span>
            <textarea
              className="textarea textarea-bordered w-full min-h-32 text-base"
              maxLength={4000}
              value={journey.premise}
              onChange={(event) => patch({ premise: event.target.value })}
            />
          </label>
          {simplified && (
            <div className="space-y-2 text-sm text-base-content/75">
              <p>{t('summaryHelp')}</p>
              <p role="status">
                {journey.mode === 'fiction'
                  ? t('fictionContinueHint')
                  : t(
                      needsMemoryContribution ? 'memoryContributionRequired' : 'memoryContinueHint',
                    )}
              </p>
            </div>
          )}
          {simplified ? (
            <>
              <section
                className="rounded-xl border border-base-300 p-4"
                aria-label={t('personalization')}
              >
                <h3 className="font-semibold">{t('personalization')}</h3>
                <div className="space-y-4 pt-4">
                  {guide}
                  {journey.answers.length > 0 && (
                    <details className="rounded-xl border border-base-300 p-3">
                      <summary className="cursor-pointer font-semibold">
                        {t('answeredQuestions')} ({journey.answers.length})
                      </summary>
                      <div className="pt-3">{answerList}</div>
                    </details>
                  )}
                </div>
              </section>
              {preferences}
            </>
          ) : (
            <>
              {answerList}
              {preferences}
              {guide}
            </>
          )}
          {!simplified && template && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                cancelRequest();
                onFreeform();
              }}
            >
              {t('mine')}
            </button>
          )}
        </section>
      )}
    </fieldset>
  );
}

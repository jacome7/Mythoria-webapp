'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Clock, Gift, Headphones, Printer } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getGoogleAnalyticsContext, trackEvent } from '@/lib/analytics';
import { currentRedactedPageParams } from '@/lib/analytics/page-context';
import type { RewardType, RewardView } from './types';

const KNOWN_ERROR_CODES = new Set([
  'expired',
  'audiobook_exists',
  'story_not_found',
  'story_not_published',
  'reward_type_not_allowed',
  'already_redeemed',
  'pending_story',
  'product_in_progress',
  'launch_failed',
  'previous_attempt_failed',
]);

type Phase = 'loading' | 'ready' | 'notFound' | 'error';

export default function SurveyRewardClient({ entitlementId }: { entitlementId: string }) {
  const t = useTranslations('SurveyReward');
  const format = useFormatter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [view, setView] = useState<RewardView | null>(null);
  const [rewardType, setRewardType] = useState<RewardType | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [startedType, setStartedType] = useState<RewardType | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/surveys/rewards/${entitlementId}`, { cache: 'no-store' });
      if (response.status === 404) {
        setPhase('notFound');
        return;
      }
      if (!response.ok) {
        setPhase('error');
        return;
      }
      setView((await response.json()) as RewardView);
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  }, [entitlementId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = () => {
    setPhase('loading');
    void load();
  };

  const allowsExistingAudiobook = view?.policy.allowExistingAudiobook ?? false;
  const isSelectable = (story: RewardView['stories'][number], type: RewardType | null) => {
    if (type !== 'audiobook') return true;
    if (story.audiobookGenerating) return false;
    return !story.hasAudiobook || allowsExistingAudiobook;
  };

  const chooseType = (type: RewardType) => {
    setRewardType(type);
    setErrorCode(null);
    const current = view?.stories.find((story) => story.storyId === storyId);
    if (current && !isSelectable(current, type)) setStoryId(null);
  };

  const claim = async () => {
    if (!rewardType || !storyId || submitting) return;
    setSubmitting(true);
    setErrorCode(null);
    const eventParams = {
      reward_type: rewardType,
      entitlement_id: entitlementId,
      // GA4 would otherwise read the entitlement id from document.location.
      ...currentRedactedPageParams(),
    };
    trackEvent('survey_reward_selected', eventParams);
    try {
      const analyticsContext = await getGoogleAnalyticsContext();
      const response = await fetch(`/api/surveys/rewards/${entitlementId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardType, storyId, analyticsContext }),
      });
      if (response.ok) {
        trackEvent('survey_reward_redeemed', eventParams);
        setStartedType(rewardType);
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { code?: string };
      const code = body.code && KNOWN_ERROR_CODES.has(body.code) ? body.code : 'generic';
      trackEvent('survey_reward_failed', { ...eventParams, error_code: code });
      setErrorCode(code);
    } catch {
      trackEvent('survey_reward_failed', { ...eventParams, error_code: 'network' });
      setErrorCode('generic');
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Gift className="h-8 w-8 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      {children}
    </div>
  );

  const stateCard = (
    icon: React.ReactNode,
    title: string,
    body: string,
    actions?: React.ReactNode,
  ) =>
    shell(
      <div className="card bg-base-100 shadow-md">
        <div className="card-body items-center text-center" role="status">
          {icon}
          <h2 className="card-title">{title}</h2>
          <p className="max-w-xl">{body}</p>
          {actions ? <div className="card-actions mt-2 justify-center">{actions}</div> : null}
        </div>
      </div>,
    );

  if (phase === 'loading') {
    return shell(
      <div className="flex min-h-48 items-center justify-center">
        <span className="loading loading-spinner loading-lg" aria-label={t('loading')} />
      </div>,
    );
  }

  if (phase === 'notFound') {
    return stateCard(
      <AlertTriangle className="h-10 w-10 text-warning" aria-hidden="true" />,
      t('notFound.title'),
      t('notFound.body'),
      <Link href="/my-stories" className="btn btn-primary">
        {t('actions.myStories')}
      </Link>,
    );
  }

  if (phase === 'error' || !view) {
    return stateCard(
      <AlertTriangle className="h-10 w-10 text-error" aria-hidden="true" />,
      t('errors.loadFailed'),
      '',
      <button type="button" className="btn btn-primary" onClick={refresh}>
        {t('retry')}
      </button>,
    );
  }

  const { entitlement } = view;
  const listenAction = entitlement.storyId ? (
    <Link href={`/stories/listen/${entitlement.storyId}`} className="btn btn-primary">
      {t('actions.listen')}
    </Link>
  ) : null;
  const myStoriesAction = (
    <Link href="/my-stories" className="btn btn-ghost">
      {t('actions.myStories')}
    </Link>
  );

  if (entitlement.status === 'pending_story') {
    return stateCard(
      <Clock className="h-10 w-10 text-primary" aria-hidden="true" />,
      t('pending.title'),
      t('pending.body'),
      <Link href="/tell-your-story" className="btn btn-primary">
        {t('pending.cta')}
      </Link>,
    );
  }

  if (entitlement.status === 'expired') {
    return stateCard(
      <Clock className="h-10 w-10 text-base-content/60" aria-hidden="true" />,
      t('expired.title'),
      t('expired.body'),
      myStoriesAction,
    );
  }

  if (entitlement.status === 'delivered') {
    return stateCard(
      <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />,
      t('delivered.title'),
      entitlement.rewardType === 'audiobook'
        ? t('delivered.audiobookBody')
        : t('delivered.pdfBody'),
      <>
        {entitlement.rewardType === 'audiobook' ? listenAction : null}
        {myStoriesAction}
      </>,
    );
  }

  if (entitlement.status === 'processing' || startedType) {
    const type = startedType ?? entitlement.rewardType;
    const justStarted = startedType !== null;
    const listen =
      type === 'audiobook' ? (
        <Link
          href={`/stories/listen/${justStarted ? storyId : entitlement.storyId}`}
          className="btn btn-primary"
        >
          {t('actions.listen')}
        </Link>
      ) : null;
    return stateCard(
      <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />,
      justStarted
        ? type === 'audiobook'
          ? t('started.audiobookTitle')
          : t('started.pdfTitle')
        : t('processing.title'),
      justStarted
        ? type === 'audiobook'
          ? t('started.audiobookBody')
          : t('started.pdfBody')
        : t('processing.body'),
      <>
        {listen}
        {justStarted ? null : (
          <button type="button" className="btn btn-ghost" onClick={refresh}>
            {t('actions.refresh')}
          </button>
        )}
        {myStoriesAction}
      </>,
    );
  }

  const options: Array<{ type: RewardType; icon: React.ReactNode }> = [
    { type: 'pdf' as const, icon: <Printer className="h-6 w-6" aria-hidden="true" /> },
    { type: 'audiobook' as const, icon: <Headphones className="h-6 w-6" aria-hidden="true" /> },
  ].filter((option) => view.policy.rewardTypes.includes(option.type));

  if (view.stories.length === 0) {
    return stateCard(
      <Clock className="h-10 w-10 text-primary" aria-hidden="true" />,
      t('pending.title'),
      t('stories.none'),
      <Link href="/tell-your-story" className="btn btn-primary">
        {t('pending.cta')}
      </Link>,
    );
  }

  const deadline = entitlement.expiresAt
    ? format.dateTime(new Date(entitlement.expiresAt), { dateStyle: 'long' })
    : null;
  const errorMessage = errorCode ? t(`errors.${errorCode}` as Parameters<typeof t>[0]) : null;

  return shell(
    <div className="space-y-8">
      <p className="text-base-content/80">
        {t('intro')} {deadline ? t('deadline', { date: deadline }) : null}
      </p>

      {entitlement.hasFailed ? (
        <div role="status" className="alert alert-warning">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span>{t('retryNote')}</span>
        </div>
      ) : null}

      <fieldset className="space-y-3">
        <legend className="mb-2 text-xl font-semibold">{t('stepGift')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map(({ type, icon }) => (
            <label
              key={type}
              className={`card cursor-pointer border bg-base-100 p-4 transition-colors ${
                rewardType === type ? 'border-primary ring-2 ring-primary/30' : 'border-base-300'
              }`}
            >
              <input
                type="radio"
                name="rewardType"
                className="sr-only"
                checked={rewardType === type}
                onChange={() => chooseType(type)}
              />
              <span className="flex items-center gap-2 font-semibold">
                {icon}
                {t(`options.${type}.title`)}
              </span>
              <span className="mt-2 text-sm text-base-content/70">
                {t(`options.${type}.description`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {rewardType ? (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-xl font-semibold">{t('stepStory')}</legend>
          {rewardType === 'audiobook' && !allowsExistingAudiobook ? (
            <p className="text-sm text-base-content/70">{t('stories.audiobookHint')}</p>
          ) : null}
          <ul className="space-y-2">
            {view.stories.map((story) => {
              const selectable = isSelectable(story, rewardType);
              const note =
                rewardType === 'audiobook' && !selectable
                  ? story.audiobookGenerating
                    ? t('stories.audiobookGenerating')
                    : t('stories.audiobookExists')
                  : rewardType === 'pdf' && story.pdfAlreadyRedeemed
                    ? t('stories.pdfAlreadyRedeemed')
                    : null;
              return (
                <li key={story.storyId}>
                  <label
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                    } ${storyId === story.storyId ? 'border-primary bg-primary/5' : 'border-base-300'}`}
                  >
                    <input
                      type="radio"
                      name="storyId"
                      className="radio radio-primary"
                      disabled={!selectable}
                      checked={storyId === story.storyId}
                      onChange={() => {
                        setStoryId(story.storyId);
                        setErrorCode(null);
                      }}
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">{story.title}</span>
                      {note ? <span className="text-xs text-base-content/60">{note}</span> : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <p className="text-sm text-base-content/70">{t('honesty')}</p>

      {errorMessage ? (
        <div role="alert" className="alert alert-error">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full sm:w-auto"
        disabled={!rewardType || !storyId || submitting}
        onClick={() => void claim()}
      >
        {submitting ? (
          <>
            <span className="loading loading-spinner loading-sm" aria-hidden="true" />
            {t('working')}
          </>
        ) : errorCode ? (
          t('retry')
        ) : (
          t('confirm')
        )}
      </button>
    </div>,
  );
}

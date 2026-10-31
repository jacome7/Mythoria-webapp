'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Gift, X } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface OpenReward {
  entitlementId: string;
  status: 'eligible' | 'selected' | 'failed';
}

const dismissKey = (entitlementId: string) => `survey-reward-banner-dismissed:${entitlementId}`;

function readDismissed(entitlementId: string): boolean {
  try {
    return window.localStorage.getItem(dismissKey(entitlementId)) === '1';
  } catch {
    return false;
  }
}

/** Dismissible My Stories banner pointing to an unclaimed survey gift. */
export default function SurveyRewardBanner() {
  const t = useTranslations('SurveyReward.banner');
  const [reward, setReward] = useState<OpenReward | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/surveys/rewards/mine', { cache: 'no-store' });
        if (!response.ok) return;
        const body = (await response.json()) as { entitlements?: OpenReward[] };
        const open = body.entitlements?.find((item) => !readDismissed(item.entitlementId));
        if (!cancelled && open) setReward(open);
      } catch {
        // The banner is a nicety; never surface a failure on My Stories.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!reward) return null;

  const needsRetry = reward.status === 'failed';
  const dismiss = () => {
    try {
      window.localStorage.setItem(dismissKey(reward.entitlementId), '1');
    } catch {
      // Dismissal then only lasts for this page view.
    }
    setReward(null);
  };

  return (
    <div role="status" className="alert border border-primary/30 bg-primary/5">
      <Gift className="h-6 w-6 text-primary" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-semibold">{needsRetry ? t('retryTitle') : t('eligibleTitle')}</p>
        <p className="text-sm">{needsRetry ? t('retryBody') : t('eligibleBody')}</p>
      </div>
      <Link
        href={`/survey/reward/${reward.entitlementId}`}
        className="btn btn-primary btn-sm whitespace-nowrap"
      >
        {t('cta')}
      </Link>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square"
        onClick={dismiss}
        aria-label={t('dismiss')}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

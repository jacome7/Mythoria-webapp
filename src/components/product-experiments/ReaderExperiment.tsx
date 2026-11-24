'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Edit3 } from 'lucide-react';
import { CONSENT_UPDATED_EVENT } from '@/lib/consent';
import { observeReader } from '@/lib/product-experiments/client';
import {
  canObserveReader,
  productExperimentRelease,
  type ExperimentArm,
} from '@/lib/product-experiments/release';

export default function ReaderExperiment({
  lastChapter,
  arm,
}: {
  lastChapter: boolean;
  arm: ExperimentArm | null;
}) {
  const locale = useLocale();
  const t = useTranslations('PublicStoryPage.actions');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!canObserveReader(productExperimentRelease, Date.now())) return;
    const controller = new AbortController();
    let bottomVisible = false;
    const observe = () => {
      if (document.visibilityState !== 'visible') return;
      observeReader('reader_started', controller.signal);
      if (lastChapter && bottomVisible) observeReader('reader_ended', controller.signal);
    };
    observe();
    const observer =
      lastChapter && end.current && typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) => {
            bottomVisible = entry.isIntersecting;
            if (bottomVisible) observe();
          })
        : null;
    if (observer && end.current) observer.observe(end.current);
    window.addEventListener(CONSENT_UPDATED_EVENT, observe);
    document.addEventListener('visibilitychange', observe);
    return () => {
      controller.abort();
      observer?.disconnect();
      window.removeEventListener(CONSENT_UPDATED_EVENT, observe);
      document.removeEventListener('visibilitychange', observe);
    };
  }, [lastChapter, arm]);
  return (
    <div ref={end} className="min-h-px print:hidden">
      {arm === 'treatment' && !lastChapter && (
        <div className="mx-auto max-w-4xl p-4 text-center">
          <a href={`/${locale}/tell-your-story`} className="btn btn-outline">
            <Edit3 className="size-4" />
            {t('createOwnStory')}
          </a>
        </div>
      )}
    </div>
  );
}

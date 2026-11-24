'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useActiveExperiment, useExperimentArm } from '@/lib/product-experiments/client';
import { canStartMobileIdea, startMobileIdea } from '@/lib/product-experiments/idea';

export default function MobileIdeaEntry({ href }: { href: string }) {
  const t = useTranslations('ProductExperiments');
  const router = useRouter();
  const [eligible, setEligible] = useState(false);
  const [idea, setIdea] = useState('');
  const [failed, setFailed] = useState(false);
  const active = useActiveExperiment() === 'mobile_idea_entry';
  useEffect(() => {
    if (!active) return;
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setEligible(media.matches && canStartMobileIdea());
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [active]);
  const arm = useExperimentArm('mobile_idea_entry', eligible);
  if (arm !== 'treatment') return null;
  return (
    <form
      className="mx-auto mt-5 max-w-sm text-left"
      onSubmit={(event) => {
        event.preventDefault();
        if (startMobileIdea(idea)) router.push(href);
        else setFailed(true);
      }}
    >
      <label className="block font-semibold" htmlFor="mobile-story-idea">
        {t('ideaLabel')}
      </label>
      <textarea
        id="mobile-story-idea"
        className="textarea textarea-bordered mt-2 w-full"
        rows={2}
        maxLength={2000}
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        required
      />
      {failed && <p role="alert">{t('ideaSaveFailed')}</p>}
      <button className="btn btn-primary mt-2" type="submit" disabled={!idea.trim()}>
        {t('ideaContinue')}
      </button>
    </form>
  );
}

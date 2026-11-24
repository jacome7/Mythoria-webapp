'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

type Props = { storyId: string; revision: string; page: number; lastPage: number };

export default function PremiumSpreadEditor({ storyId, revision, page, lastPage }: Props) {
  const t = useTranslations('PremiumBook');
  const facing = page >= 6 && page <= 31;
  const firstPage = facing ? page - (page % 2) : page;
  const target = facing
    ? `spread-${(firstPage - 6) / 2 + 1}`
    : page === 0
      ? 'front'
      : page === lastPage
        ? 'back'
        : page === 5
          ? 'opener'
          : 'ending';
  const [instructions, setInstructions] = useState('');
  const [quote, setQuote] = useState<{ canEdit: boolean; requiredCredits: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (panel.current && window.location.hash === '#illustration-editor') {
      panel.current.open = true;
      panel.current.scrollIntoView?.({ block: 'center' });
    }
  }, []);
  async function checkPrice() {
    try {
      const response = await fetch('/api/ai-edit/check-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'imageEdit', storyId }),
      });
      if (!response.ok) throw Error();
      setQuote(await response.json());
    } catch {
      setError(true);
    }
  }
  async function submit() {
    if (busy || !quote?.canEdit || !instructions.trim()) return;
    setBusy(true);
    setError(false);
    try {
      const storageKey = `premium-edit:${storyId}:${revision}:${firstPage}`;
      const previous = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      const correctionId =
        previous?.instructions === instructions ? previous.id : crypto.randomUUID();
      sessionStorage.setItem(storageKey, JSON.stringify({ id: correctionId, instructions }));
      const response = await fetch(`/api/stories/${storyId}/premium/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: revision,
          correctionId,
          maximumCredits: quote.requiredCredits,
          spreadId: target,
          artworkInstructions: instructions.trim(),
        }),
      });
      if (!response.ok) throw Error();
      sessionStorage.removeItem(storageKey);
      window.location.reload();
    } catch {
      setError(true);
      await checkPrice();
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      id="illustration-editor"
      ref={panel}
      className="mx-auto mt-3 max-w-lg"
      onToggle={(e) => {
        if (e.currentTarget.open) void checkPrice();
      }}
    >
      <summary className="cursor-pointer font-medium">
        {facing ? t('editSpread', { first: firstPage, last: firstPage + 1 }) : t('editPrompt')}
      </summary>
      <label className="mt-3 block">
        {t('editPrompt')}
        <textarea
          value={instructions}
          maxLength={1500}
          disabled={busy}
          onChange={(e) => setInstructions(e.target.value)}
          className="textarea textarea-bordered mt-1 w-full"
        />
      </label>
      {facing && <p className="my-2 text-sm">{t('editWarning')}</p>}
      {quote && <p className="text-sm">{t('editCost', { count: quote.requiredCredits })}</p>}
      {quote && !quote.canEdit && <p role="alert">{t('editBalance')}</p>}
      {error && <p role="alert">{t('editError')}</p>}
      <button
        type="button"
        className="btn btn-primary mt-2"
        disabled={busy || !quote?.canEdit || !instructions.trim()}
        onClick={() => void submit()}
      >
        {t(busy ? 'editBusy' : 'editApply')}
      </button>
    </details>
  );
}

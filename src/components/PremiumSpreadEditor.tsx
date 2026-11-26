'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import AIImageEditor from './AIImageEditor';

export type PremiumImageEditTarget = {
  firstPage: number;
  spreadId: string;
  side?: 'left' | 'right';
  imageUri: string;
  facingImageUri?: string;
  title: string;
  imageType: 'cover' | 'backcover' | 'chapter';
};

type CreditQuote = { canEdit: boolean; requiredCredits: number };

async function checkCredits(storyId: string, signal?: AbortSignal): Promise<CreditQuote> {
  const response = await fetch('/api/ai-edit/check-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'imageEdit', storyId }),
    signal,
  });
  if (!response.ok) throw new Error('Credit quote unavailable');
  return response.json();
}

export default function PremiumSpreadEditor({
  storyId,
  bookTitle,
  revision,
  target,
  onClose,
  onEditionChanged,
}: {
  storyId: string;
  bookTitle: string;
  revision: string;
  target: PremiumImageEditTarget;
  onClose: () => void;
  onEditionChanged: () => Promise<void>;
}) {
  const t = useTranslations('PremiumBook');
  const [quote, setQuote] = useState<CreditQuote>();
  const [error, setError] = useState<'editError' | 'editRetryLater'>();
  const panorama = target.spreadId.startsWith('spread-') && !target.side;

  useEffect(() => {
    const controller = new AbortController();
    void checkCredits(storyId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setQuote(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('editError');
      });
    return () => controller.abort();
  }, [storyId]);

  async function submit(instructions: string) {
    if (!quote?.canEdit) return;
    setError(undefined);
    try {
      const storageKey = `premium-edit:${storyId}:${revision}:${target.firstPage}:${target.side ?? 'spread'}`;
      const pending = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      const correctionId =
        pending?.instructions?.trim() === instructions ? pending.id : crypto.randomUUID();
      sessionStorage.setItem(storageKey, JSON.stringify({ id: correctionId, instructions }));
      const response = await fetch(`/api/stories/${storyId}/premium/corrections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedRevision: revision,
          correctionId,
          maximumCredits: quote.requiredCredits,
          spreadId: target.spreadId,
          targetSide: target.side,
          artworkInstructions: instructions,
        }),
      });
      if (response.status === 402) {
        setQuote(undefined);
        setQuote(await checkCredits(storyId));
      }
      if (response.status === 503) {
        const failure = await response.json().catch(() => null);
        if (failure?.error === 'premium_stage_busy' || failure?.error === 'edit_unavailable') {
          setError('editRetryLater');
          return;
        }
      }
      if (!response.ok) throw new Error('Premium image correction failed');
      await onEditionChanged();
      sessionStorage.removeItem(storageKey);
      onClose();
    } catch {
      setError('editError');
    }
  }

  return (
    <AIImageEditor
      isOpen
      onClose={onClose}
      story={{ storyId, title: bookTitle }}
      imageData={target}
      premiumEdit={{
        canSubmit: quote?.canEdit ?? false,
        maxLength: 1500,
        creditLabel: quote ? t('editCost', { count: quote.requiredCredits }) : undefined,
        warning: panorama ? t('editWarning') : undefined,
        error: quote && !quote.canEdit ? t('editBalance') : error ? t(error) : undefined,
        applyLabel: t('editApply'),
        busyLabel: t('editBusy'),
        facingImageUri: target.facingImageUri,
        onSubmit: submit,
      }}
    />
  );
}

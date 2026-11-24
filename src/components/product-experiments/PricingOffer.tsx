'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLocale, useTranslations } from 'next-intl';
import { useActiveExperiment, useExperimentArm } from '@/lib/product-experiments/client';

interface OfferProps {
  cost?: number;
  signupCredits?: number;
  packages: Array<{ credits: number; price: number }>;
}

export default function PricingOffer({ cost, signupCredits, packages }: OfferProps) {
  const locale = useLocale();
  const t = useTranslations('ProductExperiments');
  const original = useTranslations('PricingPage');
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [current, setCurrent] = useState<{ owner: string; balance: number } | null>(null);
  const active = useActiveExperiment() === 'offer_clarity';
  useEffect(() => {
    if (!active || !userId) return;
    const controller = new AbortController();
    void fetch('/api/credits/balance', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!controller.signal.aborted && Number.isInteger(result?.balance))
          setCurrent({ owner: userId, balance: result.balance });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [active, userId]);
  const available = isSignedIn
    ? current?.owner === userId
      ? current?.balance
      : undefined
    : signupCredits;
  const arm = useExperimentArm(
    'offer_clarity',
    !!isLoaded && cost !== undefined && available !== undefined,
  );
  // Preserve the original welcome copy only while both of its statements are accurate.
  const baseline =
    signupCredits === 5 && cost !== undefined && cost <= 5
      ? original('newUserMessage')
      : signupCredits !== undefined
        ? t('signupCredits', { credits: signupCredits })
        : null;
  if (arm !== 'treatment' || cost === undefined || available === undefined) return baseline;
  const missing = Math.max(0, cost - available);
  const pack = packages
    .filter((pkg) => pkg.credits >= missing && pkg.price > 0)
    .sort((a, b) => a.price - b.price)[0];
  return (
    <>
      {t('ebookCost', { credits: cost })}{' '}
      {isSignedIn
        ? t('balance', { credits: available })
        : t('signupCredits', { credits: available })}{' '}
      {missing === 0
        ? t('covered')
        : pack &&
          t('pack', {
            credits: pack.credits,
            price: new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
              pack.price,
            ),
          })}
    </>
  );
}

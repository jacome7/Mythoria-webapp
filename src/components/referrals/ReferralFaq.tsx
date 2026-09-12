'use client';
import { useLocale, useTranslations } from 'next-intl';
import { REFERRAL_POLICY } from '@/lib/referrals/policy';
export default function ReferralFaq({ rateBps }: { rateBps: number }) {
  const t = useTranslations('Referrals');
  const locale = useLocale();
  const values = {
    rate: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(
      rateBps / 10000,
    ),
    days: REFERRAL_POLICY.attributionDays,
    hold: REFERRAL_POLICY.holdDays,
    minimum: new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(
      REFERRAL_POLICY.minimumPaymentCents / 100,
    ),
  };
  const keys = [
    'share',
    'attribution',
    'consent',
    'purchases',
    'rate',
    'discount',
    'change',
    'status',
    'payment',
    'refund',
    'self',
    'privacy',
    'details',
    'support',
  ] as const;
  return (
    <section id="referral-faq" className="mt-10 space-y-3">
      <h2 className="text-2xl font-bold mb-4">{t('faqTitle')}</h2>
      {keys.map((key) => (
        <details className="rounded-box border border-base-300 bg-base-100" key={key}>
          <summary className="cursor-pointer px-5 py-4 font-medium focus-visible:outline-2 focus-visible:outline-primary">
            {t(`faq.${key}.q`, values)}
          </summary>
          <p className="px-5 pb-5 leading-relaxed">{t(`faq.${key}.a`, values)}</p>
        </details>
      ))}
    </section>
  );
}

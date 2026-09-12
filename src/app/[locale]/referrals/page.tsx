import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import PartnerPortal from '@/components/referrals/PartnerPortal';
import { referralFlags } from '@/lib/referrals/policy';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function ReferralsPage() {
  if (!referralFlags().portal) notFound();
  const t = await getTranslations('Referrals');
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>
      <PartnerPortal />
    </div>
  );
}

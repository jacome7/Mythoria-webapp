import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { setRequestLocale } from 'next-intl/server';
import { buildAuthEntryPath } from '@/lib/auth-return';
import SurveyRewardClient from '@/components/surveys/reward/SurveyRewardClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Survey gift page. Claiming requires being signed in; the API then only serves the gift to the
 * author the invitation was issued to, so a forwarded link shows "not found".
 */
export default async function SurveyRewardPage({
  params,
}: {
  params: Promise<{ locale: string; entitlementId: string }>;
}) {
  const { locale, entitlementId } = await params;
  setRequestLocale(locale);

  const { userId } = await auth();
  if (!userId) {
    redirect(buildAuthEntryPath(locale, 'sign-in', `/${locale}/survey/reward/${entitlementId}`));
  }

  return <SurveyRewardClient entitlementId={entitlementId} />;
}

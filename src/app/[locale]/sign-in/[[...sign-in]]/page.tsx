import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import SignInClient from './SignInClient';
import { getLeadSession, updateLeadSession, isFirstLeadAccess } from '@/lib/lead-session';

export const dynamic = 'force-dynamic';

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Check for lead session and redirect to sign-up on first access
  const leadSession = await getLeadSession();
  const isFirst = await isFirstLeadAccess();

  if (leadSession && isFirst) {
    // Mark as redirected so user can come back to sign-in if needed
    await updateLeadSession({ hasBeenRedirected: true });

    // Use the lead's language if available, otherwise use current locale
    const targetLocale = leadSession.language || locale;

    console.log('[SignInPage] Redirecting lead to sign-up:', {
      leadId: leadSession.leadId,
      email: leadSession.email,
      targetLocale,
    });

    redirect(`/${targetLocale}/sign-up`);
  }

  return <SignInClient locale={locale} />;
}

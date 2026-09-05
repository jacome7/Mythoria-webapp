import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { buildAuthEntryPath, buildAuthReturnPath } from '@/lib/auth-return';
import SignInClient from './SignInClient';
import { getLeadSession, isFirstLeadAccess } from '@/lib/lead-session';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const query = await searchParams;
  const reader = {
    get: (key: string) => {
      const value = query[key];
      return (Array.isArray(value) ? value[0] : value) ?? null;
    },
  };
  // This is only navigation intent, never an authentication or authorization signal.
  // A signup visitor explicitly choosing login must not enter the lead redirect again.
  if (reader.get('auth_mode') === 'sign-in') return <SignInClient locale={locale} />;

  // Check for lead session and redirect to sign-up on first access
  const leadSession = await getLeadSession();
  const isFirst = await isFirstLeadAccess();

  if (leadSession && isFirst) {
    // Use the lead's language if available, otherwise use current locale
    const targetLocale = leadSession.language || locale;

    const returnPath = buildAuthReturnPath(reader, `/${targetLocale}/profile/onboarding`);
    redirect(buildAuthEntryPath(targetLocale, 'sign-up', returnPath));
  }

  return <SignInClient locale={locale} />;
}

import { ReactNode } from 'react';
import { buildStaticPageMetadata } from '@/lib/static-page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return buildStaticPageMetadata({
    locale,
    path: '/termsAndConditions',
    title: 'Terms and Conditions | Mythoria',
  });
}

export default function TermsAndConditionsLayout({ children }: { children: ReactNode }) {
  return children;
}

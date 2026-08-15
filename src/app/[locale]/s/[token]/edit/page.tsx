'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { buildStoryAuthReturnSearch } from '@/lib/campaign-context';

export default function SharedStoryEditPage() {
  const params = useParams<{ token?: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const tLoading = useTranslations('Loading');
  const token = (params?.token as string | undefined) ?? '';
  const preservedSearch = buildStoryAuthReturnSearch(searchParams).toString();

  useEffect(() => {
    if (!token) return;

    // Redirect to the shared story page which will handle edit access
    router.push(`/${locale}/s/${token}${preservedSearch ? `?${preservedSearch}` : ''}`);
  }, [token, router, locale, preservedSearch]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="loading loading-spinner loading-lg text-primary"></div>
        <h2 className="text-xl font-semibold">{tLoading('redirectingToSharedStory')}</h2>
      </div>
    </div>
  );
}

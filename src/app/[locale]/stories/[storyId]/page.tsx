'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function StoryPage() {
  const router = useRouter();
  const params = useParams<{ storyId?: string }>();
  const locale = useLocale();
  const storyId = (params?.storyId as string | undefined) ?? '';

  useEffect(() => {
    // Redirect to the read page by default
    if (storyId) {
      router.replace(`/${locale}/stories/read/${storyId}`);
    }
  }, [storyId, locale, router]);

  // Show loading while redirecting
  return (<div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    </div>
  );
}

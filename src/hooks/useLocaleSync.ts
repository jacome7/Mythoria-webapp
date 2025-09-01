import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

/**
 * Hook to automatically sync user's preferred locale with the current webapp locale
 * This will update the user's database record to match their browsing locale
 */
export function useLocaleSync() {
  const { user, isSignedIn } = useUser();
  const currentLocale = useLocale();
  const hasScheduledRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || !currentLocale) return;

    // Only sync if this is a recent sign-up/sign-in (within last 2 minutes)
    // This prevents unnecessary updates on every page load
    const userCreatedAt = user.createdAt;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    
    const isRecentUser = userCreatedAt && userCreatedAt.getTime() > twoMinutesAgo;
    
    if (isRecentUser && !hasScheduledRef.current) {
      hasScheduledRef.current = true; // ensure we only schedule once
      const timeoutId = setTimeout(() => {
        updateUserLocale(currentLocale);
      }, 750); // 750ms debounce to allow author creation path to complete
      return () => clearTimeout(timeoutId);
    }
  }, [isSignedIn, user, currentLocale]);

  return null; // This hook doesn't render anything
}

async function updateUserLocale(locale: string) {
  try {
    const response = await fetch('/api/auth/update-locale', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferredLocale: locale
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('User locale synced successfully:', result.preferredLocale);
    } else {
      const error = await response.json();
      console.warn('Failed to sync user locale:', error.error);
    }
  } catch (error) {
    console.warn('Error syncing user locale:', error);
  }
}

'use client';

import { useLocaleSync } from '@/hooks/useLocaleSync';

/**
 * Client component to handle locale synchronization
 * This should be included in the app layout to automatically sync user locale
 */
export default function LocaleSync() {
  useLocaleSync();
  return null; // This component doesn't render anything
}

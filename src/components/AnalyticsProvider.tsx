'use client';

import { Suspense } from 'react';
import { useGoogleAnalytics } from '../lib/useGoogleAnalytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

function AnalyticsTracker() {
  useGoogleAnalytics();
  return null;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}

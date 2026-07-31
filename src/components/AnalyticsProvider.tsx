'use client';

import { Suspense } from 'react';
import { useGoogleAnalytics } from '../lib/useGoogleAnalytics';
import { useAuthTracking } from '../hooks/useAuthTracking';
import AnalyticsAttributionCoordinator from './AnalyticsAttributionCoordinator';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

function AnalyticsTracker() {
  useGoogleAnalytics();
  useAuthTracking();
  return <AnalyticsAttributionCoordinator />;
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

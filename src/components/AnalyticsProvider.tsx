'use client';

import { useGoogleAnalytics } from '../lib/useGoogleAnalytics';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useGoogleAnalytics();
  
  return <>{children}</>;
}

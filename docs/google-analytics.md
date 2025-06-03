# Google Analytics

The project includes optional Google Analytics 4 tracking.

1. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env.local`.
2. The component `GoogleAnalytics.tsx` loads GA only in production.
3. Use `trackEvent(name, params)` from `src/components/GoogleAnalytics.tsx` to send custom events.

Check the GA dashboard to verify that events are arriving.

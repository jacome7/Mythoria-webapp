import { SUPPORTED_LOCALES } from '@/config/locales';

export const ANONYMOUS_REQUEST_SURFACES = [
  'home',
  'landing',
  'reader',
  'creation',
  'auth',
  'commerce',
  'other',
] as const;
export type AnonymousRequestSurface = (typeof ANONYMOUS_REQUEST_SURFACES)[number];

export function anonymousRequestSurface(pathname: string): AnonymousRequestSurface | undefined {
  if (pathname === '/') return 'home';
  const [, locale, section, action] = pathname.split('/');
  if (!SUPPORTED_LOCALES.includes(locale)) return undefined;
  if (!section) return 'home';
  if (section === 'lp') return 'landing';
  if (section === 'p' || section === 's' || (section === 'stories' && action === 'read')) {
    return 'reader';
  }
  if (section === 'tell-your-story') return 'creation';
  if (section === 'sign-up' || section === 'sign-in') return 'auth';
  if (['pricing', 'buy-credits', 'credits-and-payments'].includes(section)) return 'commerce';
  return 'other';
}

export function anonymousAnalyticsEnabled(): boolean {
  return (
    process.env.ANONYMOUS_ANALYTICS_ENABLED === 'true' &&
    process.env.NEXT_PUBLIC_BASE_URL === 'https://mythoria.pt' &&
    process.env.NODE_ENV === 'production'
  );
}

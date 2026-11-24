import { SUPPORTED_LOCALES } from '@/config/locales';
import { getLandingPage } from '@/content/landing-pages';

export const ANALYTICS_BASE_URL = 'https://mythoria.pt';

const STATIC_PUBLIC_ROUTES = new Set([
  '',
  '/aboutUs',
  '/blog',
  '/contactUs',
  '/faqs',
  '/get-inspired',
  '/guias',
  '/lp',
  '/partners',
  '/pricing',
  '/privacy-policy',
  '/termsAndConditions',
]);
const STATIC_APP_ROUTES = new Set([
  '/buy-credits',
  '/credits-and-payments',
  '/my-characters',
  '/my-personas',
  '/my-stories',
  '/privacy-policy/delete-account',
  '/profile',
  '/profile/onboarding',
  '/referrals',
  '/tell-your-story',
  '/tell-your-story/step-1',
  '/tell-your-story/step-2',
  '/tell-your-story/step-3',
  '/tell-your-story/step-4',
  '/tell-your-story/step-5',
]);

/** Map every recognized dynamic route to a fixed template. Unknown routes have no context. */
export function sanitizeAnalyticsPathname(pathname: string): string | undefined {
  if (!pathname.startsWith('/') || pathname.length > 4096 || /[?#\\]/.test(pathname)) {
    return undefined;
  }
  if (pathname === '/' || pathname === '/offline') return pathname;
  const [, locale, ...segments] = pathname.replace(/\/$/, '').split('/');
  if (!SUPPORTED_LOCALES.includes(locale)) return undefined;
  const prefix = `/${locale}`;
  const path = segments.length ? `/${segments.join('/')}` : '';
  const [section, identifier, operation, index] = segments;
  if (STATIC_PUBLIC_ROUTES.has(path) || STATIC_APP_ROUTES.has(path)) return prefix + path;
  if (section === 'lp' && identifier && segments.length === 2) {
    return identifier === ':landing' || getLandingPage(locale, identifier)
      ? `${prefix}/lp/${identifier}`
      : `${prefix}/lp/:landing`;
  }
  if (['blog', 'guias', 'sample-books'].includes(section) && identifier && segments.length === 2) {
    return `${prefix}/${section}/:article`;
  }
  if (section === 's' && identifier) {
    return `${prefix}/s/:token${operation === 'edit' ? '/edit' : ''}`;
  }
  if (section === 'p' && identifier) {
    if (operation === 'chapter' && index) return `${prefix}/p/:story/chapter/:chapter`;
    return `${prefix}/p/:story${operation === 'listen' ? '/listen' : ''}`;
  }
  if (section === 'stories' && identifier) {
    if (['read', 'edit', 'listen', 'print'].includes(identifier) && operation) {
      return `${prefix}/stories/${identifier}/:id${index === 'chapter' ? '/chapter/:chapter' : ''}`;
    }
    return `${prefix}/stories/:id`;
  }
  if (section === 'sign-in' || section === 'sign-up') return `${prefix}/${section}`;
  if (section === 'biographer') return `${prefix}/biographer`;
  if (section === 'survey' && identifier) {
    return `${prefix}/survey/${identifier === 'reward' ? 'reward/:id' : ':token'}`;
  }
  return undefined;
}

function allowedOrigins(): Set<string> {
  const origins = new Set([ANALYTICS_BASE_URL]);
  for (const candidate of [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_ANALYTICS_AUDIT_ORIGIN,
  ]) {
    try {
      if (candidate) origins.add(new URL(candidate).origin);
    } catch {
      // Invalid configuration never adds an origin.
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost');
    origins.add('http://localhost:3000');
  }
  return origins;
}

export function sanitizeAnalyticsPageUrl(value?: string | null): string | undefined {
  if (!value || value.length > 4096) return undefined;
  try {
    const url = new URL(value);
    if (!allowedOrigins().has(url.origin) || url.username || url.password) return undefined;
    const pathname = sanitizeAnalyticsPathname(url.pathname);
    return pathname ? url.origin + pathname : undefined;
  } catch {
    return undefined;
  }
}

/** A third-party SDK can read the document even when its explicit events use route templates. */
export function canLoadAuditBrowserTag(url: URL, referrer: string): boolean {
  if (url.search || url.hash || sanitizeAnalyticsPathname(url.pathname) !== url.pathname) {
    return false;
  }
  const path = url.pathname.replace(/^\/[a-z]{2}-[A-Z]{2}/, '');
  if (!STATIC_PUBLIC_ROUTES.has(path) && !path.startsWith('/lp/')) return false;
  if (!referrer) return true;
  try {
    const source = new URL(referrer);
    return (
      !source.search &&
      !source.hash &&
      (source.pathname === '/' ||
        (source.origin === url.origin && canLoadAuditBrowserTag(source, '')))
    );
  } catch {
    return false;
  }
}

export function currentBrowserPageContext(): {
  pageLocation?: string;
  pageReferrer?: string;
} {
  if (typeof window === 'undefined') return {};
  const pageLocation = sanitizeAnalyticsPageUrl(window.location.href);
  const pageReferrer = sanitizeAnalyticsPageUrl(document.referrer);
  return {
    ...(pageLocation ? { pageLocation } : {}),
    ...(pageReferrer ? { pageReferrer } : {}),
  };
}

export function redactedPageParams(path: string): { page_location: string; page_path: string } {
  const pathname = sanitizeAnalyticsPathname(path) || '/';
  const origin = typeof window === 'undefined' ? ANALYTICS_BASE_URL : window.location.origin;
  return { page_location: origin + pathname, page_path: pathname };
}

export function currentRedactedPageParams(): { page_location: string; page_path: string } {
  return redactedPageParams(typeof window === 'undefined' ? '/' : window.location.pathname);
}

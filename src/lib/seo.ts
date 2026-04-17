import { routing } from '@/i18n/routing';

export const BASE_URL = 'https://mythoria.pt';

export const STATIC_LOCALIZED_PATH_SUFFIXES = new Set([
  '',
  '/aboutUs',
  '/contactUs',
  '/faqs',
  '/pricing',
  '/privacy-policy',
  '/termsAndConditions',
  '/tell-your-story',
  '/get-inspired',
  '/blog',
  '/partners',
]);

const localeLookup = new Map(routing.locales.map((locale) => [locale.toLowerCase(), locale]));

export function normalizePathname(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  let candidatePath = pathname;
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    try {
      candidatePath = new URL(pathname).pathname;
    } catch {
      candidatePath = pathname;
    }
  }

  const [pathOnly] = candidatePath.split('?');
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;

  if (withLeadingSlash === '/') {
    return '/';
  }

  return withLeadingSlash.replace(/\/+$/, '');
}

export function buildAbsoluteUrl(pathname: string): string {
  const normalized = normalizePathname(pathname);
  return normalized === '/' ? BASE_URL : `${BASE_URL}${normalized}`;
}

export function buildLocalizedPath(locale: string, pathSuffix: string = ''): string {
  const normalizedSuffix = normalizePathname(pathSuffix || '/');
  const suffix = normalizedSuffix === '/' ? '' : normalizedSuffix;

  return normalizePathname(`/${locale}${suffix}`);
}

export function buildLocalizedUrl(locale: string, pathSuffix: string = ''): string {
  return buildAbsoluteUrl(buildLocalizedPath(locale, pathSuffix));
}

export function extractLocalizedPath(pathname: string): { locale?: string; pathSuffix: string } {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split('/').filter(Boolean);

  if (!segments.length) {
    return { pathSuffix: '' };
  }

  const canonicalLocale = localeLookup.get(segments[0].toLowerCase());
  if (!canonicalLocale) {
    return { pathSuffix: normalized === '/' ? '' : normalized };
  }

  const remainder = segments.slice(1).join('/');
  return {
    locale: canonicalLocale,
    pathSuffix: remainder ? `/${remainder}` : '',
  };
}

export function getStaticLocalizedHreflangLinks(
  pathname: string,
): Record<string, string> | undefined {
  const { pathSuffix } = extractLocalizedPath(pathname);

  if (!STATIC_LOCALIZED_PATH_SUFFIXES.has(pathSuffix)) {
    return undefined;
  }

  return Object.fromEntries(
    routing.locales.map((locale) => [locale, buildLocalizedUrl(locale, pathSuffix)]),
  );
}

export function shouldIncludeXDefault(pathname: string): boolean {
  const { pathSuffix } = extractLocalizedPath(pathname);
  return pathSuffix === '';
}

export function getCanonicalRedirectPath(pathname: string): string | null {
  if (!pathname || pathname === '/') {
    return null;
  }

  const segments = pathname.split('/');
  let changed = false;

  const firstSegment = segments[1];
  if (firstSegment) {
    const canonicalLocale = localeLookup.get(firstSegment.toLowerCase());
    if (canonicalLocale && canonicalLocale !== firstSegment) {
      segments[1] = canonicalLocale;
      changed = true;
    }
  }

  let rewritten = segments.join('/');
  if (rewritten.length > 1 && rewritten.endsWith('/')) {
    rewritten = rewritten.replace(/\/+$/, '');
    changed = true;
  }

  return changed ? rewritten || '/' : null;
}

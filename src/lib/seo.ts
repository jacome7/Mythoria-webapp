import { routing } from '@/i18n/routing';

export const BASE_URL = 'https://mythoria.pt';
export const DEFAULT_LOCALE = routing.defaultLocale;
export const CANONICAL_HOST = new URL(BASE_URL).hostname;
export const PUBLIC_HOST_ALIASES = new Set([CANONICAL_HOST, `www.${CANONICAL_HOST}`]);

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

export type SeoRouteKind =
  | 'static-public'
  | 'blog-post'
  | 'landing-index'
  | 'landing-page'
  | 'public-story'
  | 'public-low-value'
  | 'private'
  | 'unknown';

export type SeoRoutePolicy = {
  kind: SeoRouteKind;
  indexable: boolean;
  follow: boolean;
  includeInSitemap: boolean;
  canonicalPath?: string;
  entityValidationRequired: boolean;
};

const PRIVATE_LOCALIZED_PREFIXES = [
  '/buy-credits',
  '/credits-and-payments',
  '/my-characters',
  '/my-personas',
  '/my-stories',
  '/profile',
  '/s',
  '/sign-in',
  '/sign-up',
  '/stories',
  '/unsubscribe',
];

export function canonicalizePathname(pathname: string): string {
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
  const withoutDuplicateSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');

  if (withoutDuplicateSlashes === '/') {
    return '/';
  }

  return withoutDuplicateSlashes.replace(/\/+$/, '');
}

export const normalizePathname = canonicalizePathname;

export function buildAbsoluteUrl(pathname: string): string {
  if (pathname.startsWith('http://') || pathname.startsWith('https://')) {
    return pathname;
  }

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
    return `/${DEFAULT_LOCALE}`;
  }

  const normalizedSlashes = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const collapsed = normalizedSlashes.replace(/\/{2,}/g, '/');
  const segments = collapsed.split('/');
  let changed = false;

  if (collapsed !== pathname) {
    changed = true;
  }

  const firstSegment = segments[1];
  if (firstSegment) {
    const canonicalLocale = localeLookup.get(firstSegment.toLowerCase());
    if (canonicalLocale && canonicalLocale !== firstSegment) {
      segments[1] = canonicalLocale;
      changed = true;
    }
  }

  let rewritten = segments.join('/');

  if (rewritten === '/lp' || rewritten === '/lp/') {
    return '/pt-PT/lp';
  }

  if (/^\/lp\/[^/]+\/?$/.test(rewritten)) {
    return `/pt-PT${rewritten.replace(/\/+$/, '')}`;
  }

  if (rewritten.length > 1 && rewritten.endsWith('/')) {
    rewritten = rewritten.replace(/\/+$/, '');
    changed = true;
  }

  return changed ? rewritten || '/' : null;
}

export function getTrainingBotDisallowPaths(): string[] {
  const localizedPrivatePaths = routing.locales.flatMap((locale) => [
    ...PRIVATE_LOCALIZED_PREFIXES.map((prefix) => `/${locale}${prefix}`),
    `/${locale}/tell-your-story/step-`,
  ]);

  return ['/api/', '/portaldegestao/', '/.well-known/', ...localizedPrivatePaths];
}

function isPathWithin(pathSuffix: string, prefix: string): boolean {
  return pathSuffix === prefix || pathSuffix.startsWith(`${prefix}/`);
}

export function getSeoRoutePolicy(pathname: string): SeoRoutePolicy {
  const canonicalPath = canonicalizePathname(pathname);
  const { locale, pathSuffix } = extractLocalizedPath(canonicalPath);

  if (!locale) {
    return {
      kind: 'unknown',
      indexable: false,
      follow: false,
      includeInSitemap: false,
      entityValidationRequired: false,
    };
  }

  const base = { canonicalPath: buildLocalizedPath(locale, pathSuffix) };

  if (STATIC_LOCALIZED_PATH_SUFFIXES.has(pathSuffix) && pathSuffix !== '/partners') {
    return {
      ...base,
      kind: 'static-public',
      indexable: true,
      follow: true,
      includeInSitemap: true,
      entityValidationRequired: false,
    };
  }

  if (pathSuffix === '/partners') {
    return {
      ...base,
      kind: 'public-low-value',
      indexable: false,
      follow: true,
      includeInSitemap: false,
      entityValidationRequired: false,
    };
  }

  if (pathSuffix === '/lp') {
    const indexable = locale === 'pt-PT';
    return {
      ...base,
      kind: 'landing-index',
      indexable,
      follow: true,
      includeInSitemap: indexable,
      entityValidationRequired: false,
    };
  }

  if (/^\/lp\/[^/]+$/.test(pathSuffix)) {
    return {
      ...base,
      kind: 'landing-page',
      indexable: true,
      follow: true,
      includeInSitemap: true,
      entityValidationRequired: true,
    };
  }

  if (/^\/blog\/[^/]+$/.test(pathSuffix)) {
    return {
      ...base,
      kind: 'blog-post',
      indexable: true,
      follow: true,
      includeInSitemap: true,
      entityValidationRequired: true,
    };
  }

  if (/^\/p\/[^/]+$/.test(pathSuffix)) {
    return {
      ...base,
      kind: 'public-story',
      indexable: true,
      follow: true,
      includeInSitemap: true,
      entityValidationRequired: true,
    };
  }

  if (
    PRIVATE_LOCALIZED_PREFIXES.some((prefix) => isPathWithin(pathSuffix, prefix)) ||
    pathSuffix.startsWith('/tell-your-story/step-') ||
    pathSuffix.startsWith('/p/')
  ) {
    return {
      ...base,
      kind: 'private',
      indexable: false,
      follow: false,
      includeInSitemap: false,
      entityValidationRequired: false,
    };
  }

  return {
    ...base,
    kind: 'unknown',
    indexable: false,
    follow: false,
    includeInSitemap: false,
    entityValidationRequired: false,
  };
}

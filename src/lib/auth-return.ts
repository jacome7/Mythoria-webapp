import { CAMPAIGN_QUERY_KEYS, getValidatedIntent } from '@/lib/campaign-context';

export const AUTH_RETURN_PARAM = 'redirect';
export const LEGACY_AUTH_RETURN_PARAM = 'redirectUrl';

type SearchParamsReader = { get(name: string): string | null };

const MAX_RETURN_PATH_LENGTH = 2_048;
const MAX_CONTEXT_VALUE_LENGTH = 255;

export function sanitizeInternalReturnPath(
  candidate: string | null | undefined,
  fallback: string,
): string {
  const safeFallback = fallback.startsWith('/') && !fallback.startsWith('//') ? fallback : '/';
  if (
    !candidate ||
    candidate.length > MAX_RETURN_PATH_LENGTH ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(candidate)
  ) {
    return safeFallback;
  }

  try {
    const parsed = new URL(candidate, 'https://mythoria.pt');
    if (parsed.origin !== 'https://mythoria.pt') return safeFallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return safeFallback;
  }
}

export function extractLandingSlug(pathname: string): string | undefined {
  const match = pathname.match(/^\/[a-z]{2}-[A-Z]{2}\/lp\/([^/?#]+)\/?$/);
  const slug = match?.[1]?.trim();
  return slug && slug.length <= 160 ? slug : undefined;
}

function readFirst(search: SearchParamsReader, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = search.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function buildAuthReturnPath(search: SearchParamsReader, fallback: string): string {
  const requested = readFirst(search, AUTH_RETURN_PARAM, LEGACY_AUTH_RETURN_PARAM);
  const safeReturn = sanitizeInternalReturnPath(requested, fallback);
  const result = new URL(safeReturn, 'https://mythoria.pt');

  const landingPath = sanitizeInternalReturnPath(
    readFirst(search, 'landing_path', 'landingPath'),
    result.pathname,
  );
  if (!result.searchParams.has('landing_path'))
    result.searchParams.set('landing_path', landingPath);

  const landingSlug = readFirst(search, 'landing_slug', 'landingSlug');
  if (
    landingSlug &&
    landingSlug.length <= 160 &&
    !/[\\/?#\u0000-\u001f\u007f]/.test(landingSlug) &&
    !result.searchParams.has('landing_slug')
  ) {
    result.searchParams.set('landing_slug', landingSlug);
  }

  const primaryIntent = getValidatedIntent(
    readFirst(search, 'primary_intent', 'primaryIntent', 'intent'),
  );
  if (primaryIntent && !result.searchParams.has('primary_intent')) {
    result.searchParams.set('primary_intent', primaryIntent);
  }

  for (const key of CAMPAIGN_QUERY_KEYS) {
    const value = search.get(key)?.trim();
    if (value && value.length <= MAX_CONTEXT_VALUE_LENGTH && !result.searchParams.has(key)) {
      result.searchParams.set(key, value);
    }
  }

  return `${result.pathname}${result.search}${result.hash}`;
}

export function buildAuthEntryPath(
  locale: string,
  action: 'sign-in' | 'sign-up',
  returnPath: string,
): string {
  const safeReturn = sanitizeInternalReturnPath(returnPath, `/${locale}`);
  return `/${locale}/${action}?${AUTH_RETURN_PARAM}=${encodeURIComponent(safeReturn)}`;
}

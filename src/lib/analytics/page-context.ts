export const ANALYTICS_BASE_URL = 'https://mythoria.pt';

const UUID_SEGMENT =
  /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi;
const PRIVATE_SHARE_SEGMENT = /(\/s\/)[^/]+/gi;

function allowedOrigins(): Set<string> {
  const origins = new Set([new URL(ANALYTICS_BASE_URL).origin]);
  const configured = process.env.NEXT_PUBLIC_BASE_URL;
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      // Invalid environment values are rejected by the environment manifest.
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost');
    origins.add('http://localhost:3000');
  }
  return origins;
}

export function sanitizeAnalyticsPathname(pathname: string): string | undefined {
  if (!pathname.startsWith('/') || pathname.length > 160) return undefined;
  return pathname
    .replace(UUID_SEGMENT, '/:id')
    .replace(PRIVATE_SHARE_SEGMENT, '$1:token')
    .replace(/\/{2,}/g, '/');
}

export function sanitizeAnalyticsPageUrl(value?: string | null): string | undefined {
  if (!value || value.length > 4096) return undefined;
  try {
    const url = new URL(value);
    if (!allowedOrigins().has(url.origin)) return undefined;
    const pathname = sanitizeAnalyticsPathname(url.pathname);
    return pathname ? `${url.origin}${pathname}` : undefined;
  } catch {
    return undefined;
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

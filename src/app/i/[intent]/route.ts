import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidIntent, normalizeIntent } from '@/constants/intents';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/config/locales';
import {
  INTENT_CONTEXT_COOKIE,
  INTENT_CONTEXT_MAX_AGE,
  type IntentContext,
} from '@/types/intent-context';

/**
 * Intent detection route handler (without recipient)
 * Pattern: /i/{intent}
 *
 * This route:
 * 1. Validates intent from URL params
 * 2. Detects user's preferred locale
 * 3. Stores context in cookies
 * 4. Redirects to the localized homepage
 */
export async function GET(request: NextRequest, context: { params: Promise<{ intent: string }> }) {
  const { intent: rawIntent } = await context.params;

  // Normalize and validate intent
  const normalizedIntent = normalizeIntent(rawIntent);
  const isIntentValid = isValidIntent(normalizedIntent);

  // Build context object (only include valid values)
  const intentContext: IntentContext = {};
  if (isIntentValid && normalizedIntent) {
    intentContext.intent = normalizedIntent;
  }

  // Detect user's preferred locale
  const locale = detectUserLocale(request);

  // Determine the base URL for the redirect to avoid 0.0.0.0 in containerized environments
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('0.0.0.0')) {
      baseUrl = `${protocol}://${host}`;
    }
  }

  // Fallback to hardcoded production URL if all else fails
  if (!baseUrl) {
    baseUrl = 'https://mythoria.pt';
  }

  // Create redirect response
  const redirectUrl = new URL(`/${locale}`, baseUrl);
  const response = NextResponse.redirect(redirectUrl);

  // Store context in cookies if we have valid data
  if (intentContext.intent) {
    const cookieStore = await cookies();
    cookieStore.set(INTENT_CONTEXT_COOKIE, JSON.stringify(intentContext), {
      httpOnly: false, // Allow client-side access if needed
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: INTENT_CONTEXT_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

/**
 * Detect user's preferred locale from:
 * 1. Accept-Language header (primary)
 * 2. Default to 'en-US'
 */
function detectUserLocale(request: NextRequest): SupportedLocale {
  const acceptLanguage = request.headers.get('accept-language');

  if (acceptLanguage) {
    // Parse Accept-Language: e.g., "en-US,en;q=0.9,pt-PT;q=0.8"
    const preferredLanguages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [locale] = lang.trim().split(';');
        return locale;
      })
      .filter(Boolean);

    // Find first match from supported locales
    for (const lang of preferredLanguages) {
      const supportedLocale = SUPPORTED_LOCALES.find(
        (supported) => supported.toLowerCase() === lang.toLowerCase(),
      ) as SupportedLocale | undefined;
      if (supportedLocale) {
        return supportedLocale;
      }
    }
  }

  // Default fallback
  return 'en-US';
}

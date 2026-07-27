import { NextRequest, NextResponse } from 'next/server';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/config/locales';
import { isValidRecipient, normalizeRecipient } from '@/constants/recipients';
import {
  buildPublicRedirectSearch,
  getValidatedIntent,
  serializeIntentContext,
} from '@/lib/campaign-context';
import {
  INTENT_CONTEXT_COOKIE,
  INTENT_CONTEXT_MAX_AGE,
  type IntentContext,
} from '@/types/intent-context';

const localeLookup = new Map(
  SUPPORTED_LOCALES.map((locale) => [locale.toLowerCase(), locale as SupportedLocale]),
);

export function detectLegacyIntentLocale(request: NextRequest): SupportedLocale {
  const explicitLocale = request.nextUrl.searchParams.get('locale');
  const explicitMatch = explicitLocale ? localeLookup.get(explicitLocale.toLowerCase()) : undefined;
  if (explicitMatch) return explicitMatch;

  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const cookieMatch = cookieLocale ? localeLookup.get(cookieLocale.toLowerCase()) : undefined;
  if (cookieMatch) return cookieMatch;

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    for (const range of acceptLanguage.split(',')) {
      const language = range.trim().split(';')[0]?.toLowerCase();
      if (!language) continue;
      const exact = localeLookup.get(language);
      if (exact) return exact;
      const languageOnly = language.split('-')[0];
      const partial = SUPPORTED_LOCALES.find(
        (locale) => locale.toLowerCase().split('-')[0] === languageOnly,
      );
      if (partial) return partial as SupportedLocale;
    }
  }

  return (SUPPORTED_LOCALES[0] as SupportedLocale | undefined) ?? 'en-US';
}

export function buildLegacyIntentResponse(
  request: NextRequest,
  rawIntent: string,
  rawRecipient?: string,
): NextResponse {
  const locale = detectLegacyIntentLocale(request);
  const intent = getValidatedIntent(rawIntent);
  const normalizedRecipient = rawRecipient ? normalizeRecipient(rawRecipient) : null;
  const recipient =
    normalizedRecipient && isValidRecipient(normalizedRecipient) ? normalizedRecipient : null;

  const destination = new URL(`/${locale}`, request.nextUrl.origin);
  destination.search = buildPublicRedirectSearch(request.nextUrl.searchParams, intent).toString();
  const response = NextResponse.redirect(destination, 308);

  const context: IntentContext = {
    ...(intent ? { intent } : {}),
    ...(recipient ? { recipient } : {}),
  };
  if (context.intent || context.recipient) {
    response.cookies.set(INTENT_CONTEXT_COOKIE, serializeIntentContext(context), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: INTENT_CONTEXT_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

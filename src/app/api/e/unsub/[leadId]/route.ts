import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';

/**
 * Unsubscribe Route
 * GET /api/e/unsub/[leadId]
 *
 * Handles unsubscribe requests and redirects to localized confirmation page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const { leadId } = await params;

  // Detect user's preferred locale from Accept-Language header or use default
  const acceptLanguage = request.headers.get('accept-language') || '';
  const locale = detectLocale(acceptLanguage);

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(leadId)) {
    return NextResponse.redirect(new URL(`/${locale}/unsubscribe?status=invalid`, request.url));
  }

  try {
    // Get lead data
    const lead = await leadService.getLeadById(leadId);

    if (!lead) {
      return NextResponse.redirect(new URL(`/${locale}/unsubscribe?status=not-found`, request.url));
    }

    // Check if already unsubscribed
    if (lead.emailStatus === 'unsub') {
      const sanitizedEmail = sanitizeEmail(lead.email);
      return NextResponse.redirect(
        new URL(
          `/${locale}/unsubscribe?status=already-unsubscribed&email=${encodeURIComponent(sanitizedEmail)}`,
          request.url,
        ),
      );
    }

    // Unsubscribe the lead
    await leadService.unsubscribe(leadId);

    console.log('[Unsubscribe] Lead unsubscribed:', {
      leadId,
      email: lead.email,
    });

    const sanitizedEmail = sanitizeEmail(lead.email);
    return NextResponse.redirect(
      new URL(
        `/${locale}/unsubscribe?status=success&email=${encodeURIComponent(sanitizedEmail)}`,
        request.url,
      ),
    );
  } catch (error) {
    console.error('[Unsubscribe] Error processing unsubscribe:', error);

    return NextResponse.redirect(new URL(`/${locale}/unsubscribe?status=error`, request.url));
  }
}

/**
 * Detect user's preferred locale from Accept-Language header
 */
function detectLocale(acceptLanguage: string): string {
  const supportedLocales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';');
      const locale = parts[0];
      const quality = parts[1] ? parseFloat(parts[1].replace('q=', '')) : 1.0;
      return { locale, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Try to match exact locale
  for (const { locale } of languages) {
    const normalizedLocale = locale.replace('_', '-');
    if (supportedLocales.includes(normalizedLocale)) {
      return normalizedLocale;
    }
  }

  // Try to match language code (e.g., 'pt' matches 'pt-PT')
  for (const { locale } of languages) {
    const langCode = locale.split('-')[0].toLowerCase();
    const match = supportedLocales.find((supported) =>
      supported.toLowerCase().startsWith(langCode),
    );
    if (match) {
      return match;
    }
  }

  // Default to English
  return 'en-US';
}

/**
 * Sanitize email for display (show first few chars and domain)
 */
function sanitizeEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  const visibleChars = Math.min(3, local.length);
  const maskedLocal = local.substring(0, visibleChars) + '***';
  return `${maskedLocal}@${domain}`;
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * User Unsubscribe Route
 * GET /api/e/unsub/user/[authorId]
 *
 * Handles unsubscribe requests for registered users (authors).
 * Updates their notificationPreference to 'essential' (most restrictive)
 * and redirects to localized confirmation page.
 *
 * This route does NOT require authentication — one-click unsubscribe
 * must work without login per GDPR / CAN-SPAM requirements.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ authorId: string }> },
) {
  const { authorId } = await params;

  // Detect user's preferred locale from Accept-Language header or use default
  const acceptLanguage = request.headers.get('accept-language') || '';
  const locale = detectLocale(acceptLanguage);

  // Determine base URL to avoid 0.0.0.0 in containerized environments
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    if (host && !host.includes('0.0.0.0')) {
      baseUrl = `${protocol}://${host}`;
    }
  }
  const base = baseUrl || 'https://mythoria.pt';

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(authorId)) {
    return NextResponse.redirect(new URL(`/${locale}/unsubscribe?status=invalid&type=user`, base));
  }

  try {
    // Look up the author
    const [author] = await db
      .select({
        authorId: authors.authorId,
        email: authors.email,
        notificationPreference: authors.notificationPreference,
        preferredLocale: authors.preferredLocale,
      })
      .from(authors)
      .where(eq(authors.authorId, authorId))
      .limit(1);

    if (!author) {
      return NextResponse.redirect(
        new URL(`/${locale}/unsubscribe?status=not-found&type=user`, base),
      );
    }

    // Use the author's preferred locale if available
    const authorLocale = author.preferredLocale || locale;

    // Check if already on essential (most restrictive)
    if (author.notificationPreference === 'essential') {
      const sanitizedEmail = sanitizeEmail(author.email);
      return NextResponse.redirect(
        new URL(
          `/${authorLocale}/unsubscribe?status=already-unsubscribed&type=user&email=${encodeURIComponent(sanitizedEmail)}`,
          base,
        ),
      );
    }

    // Update notification preference to 'essential'
    await db
      .update(authors)
      .set({ notificationPreference: 'essential' })
      .where(eq(authors.authorId, authorId));

    console.log('[Unsubscribe] User preference updated to essential:', {
      authorId,
      email: author.email,
      previousPreference: author.notificationPreference,
    });

    const sanitizedEmail = sanitizeEmail(author.email);
    return NextResponse.redirect(
      new URL(
        `/${authorLocale}/unsubscribe?status=success&type=user&email=${encodeURIComponent(sanitizedEmail)}`,
        base,
      ),
    );
  } catch (error) {
    console.error('[Unsubscribe] Error processing user unsubscribe:', error);
    return NextResponse.redirect(
      new URL(`/${locale}/unsubscribe?status=error&type=user`, base),
    );
  }
}

/**
 * Detect user's preferred locale from Accept-Language header
 */
function detectLocale(acceptLanguage: string): string {
  const supportedLocales = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];

  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const parts = lang.trim().split(';');
      const loc = parts[0];
      const quality = parts[1] ? parseFloat(parts[1].replace('q=', '')) : 1.0;
      return { locale: loc, quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of languages) {
    const normalizedLocale = locale.replace('_', '-');
    if (supportedLocales.includes(normalizedLocale)) {
      return normalizedLocale;
    }
  }

  for (const { locale } of languages) {
    const langCode = locale.split('-')[0].toLowerCase();
    const match = supportedLocales.find((supported) =>
      supported.toLowerCase().startsWith(langCode),
    );
    if (match) {
      return match;
    }
  }

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

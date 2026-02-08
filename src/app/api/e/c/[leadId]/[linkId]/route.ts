import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';
import { setLeadSession } from '@/lib/lead-session';
import { routing } from '@/i18n/routing';

/**
 * Click Tracking Route
 * GET /api/e/c/[leadId]/[linkId]
 *
 * Tracks email clicks, sets lead session cookie, and redirects to destination
 * The linkId is used as the destination path (e.g., 'sign-up' -> '/[locale]/sign-up')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string; linkId: string }> },
) {
  const { leadId, linkId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(leadId)) {
    // Non-UUID leadId (e.g. 'sample' from test sends) — redirect gracefully
    const defaultLocale = routing.defaultLocale;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
    const target = linkId === 'homepage' ? `/${defaultLocale}` : `/${defaultLocale}/${linkId}`;
    return NextResponse.redirect(new URL(target, baseUrl), { status: 302 });
  }

  // Validate linkId (basic sanitization - must not contain '..' or special chars)
  if (!linkId || linkId.includes('..') || linkId.includes('//')) {
    console.warn('[ClickTracking] Invalid linkId:', linkId);
    return new NextResponse('Invalid link ID', { status: 400 });
  }

  // Special handling for homepage link - track click and redirect to homepage
  if (linkId === 'homepage') {
    try {
      const lead = await leadService.getLeadById(leadId);
      if (lead) {
        // Record the click event
        leadService.recordClick(leadId, 'homepage').catch((error) => {
          console.error('[ClickTracking] Failed to record click:', error);
        });

        // Set lead session cookie with lead data
        await setLeadSession({
          leadId: lead.id,
          email: lead.email,
          mobilePhone: lead.mobilePhone,
          name: lead.name,
          language: lead.language,
        });

        // Determine locale from lead language or use default
        const locale = lead.language || routing.defaultLocale;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
        const redirectUrl = new URL(`/${locale}`, baseUrl);

        console.log('[ClickTracking] Homepage redirect:', {
          leadId,
          locale,
          baseUrl,
        });

        return NextResponse.redirect(redirectUrl, { status: 302 });
      }
    } catch (error) {
      console.error('[ClickTracking] Error tracking homepage click:', error);
    }

    // Fallback redirect to homepage even if lead not found
    const defaultLocale = routing.defaultLocale;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
    const redirectUrl = new URL(`/${defaultLocale}`, baseUrl);
    return NextResponse.redirect(redirectUrl);
  }

  // Special handling for unsubscribe link - redirect to dedicated unsubscribe endpoint
  // which handles locale detection and proper status messages
  if (linkId === 'unsubscribe') {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
    const unsubscribeUrl = new URL(`/api/e/unsub/${leadId}`, baseUrl);

    console.log('[ClickTracking] Redirecting to unsubscribe endpoint:', {
      leadId,
      redirectUrl: unsubscribeUrl.toString(),
    });

    return NextResponse.redirect(unsubscribeUrl, { status: 302 });
  }

  try {
    // Get lead data
    const lead = await leadService.getLeadById(leadId);

    if (!lead) {
      console.warn('[ClickTracking] Lead not found:', leadId);
      // Still redirect to avoid broken experience, but don't set session
      const defaultLocale = routing.defaultLocale;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
      const redirectUrl = new URL(`/${defaultLocale}/${linkId}`, baseUrl);
      return NextResponse.redirect(redirectUrl);
    }

    // Record the click event (async, continue even if it fails)
    leadService.recordClick(leadId, linkId).catch((error) => {
      console.error('[ClickTracking] Failed to record click:', error);
    });

    // Set lead session cookie with lead data
    await setLeadSession({
      leadId: lead.id,
      email: lead.email,
      mobilePhone: lead.mobilePhone,
      name: lead.name,
      language: lead.language,
    });

    // Determine locale from lead language or use default
    const locale = lead.language || routing.defaultLocale;

    // Build redirect URL: /[locale]/[linkId]
    // linkId can be paths like 'sign-up', 'aboutUs', 'tell-your-story', etc.
    const redirectPath = `/${locale}/${linkId}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
    const redirectUrl = new URL(redirectPath, baseUrl);

    console.log('[ClickTracking] Redirecting:', {
      leadId,
      linkId,
      locale,
      redirectPath,
      baseUrl,
    });

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (error) {
    console.error('[ClickTracking] Error processing click:', error);

    // Fallback redirect to avoid broken links
    const defaultLocale = routing.defaultLocale;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt';
    const redirectUrl = new URL(`/${defaultLocale}/${linkId}`, baseUrl);
    return NextResponse.redirect(redirectUrl);
  }
}

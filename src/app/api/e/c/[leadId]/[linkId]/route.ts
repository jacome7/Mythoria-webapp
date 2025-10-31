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
    console.warn('[ClickTracking] Invalid UUID format:', leadId);
    return new NextResponse('Invalid lead ID', { status: 400 });
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
        const redirectUrl = new URL(`/${locale}`, request.url);

        console.log('[ClickTracking] Homepage redirect:', {
          leadId,
          locale,
        });

        return NextResponse.redirect(redirectUrl, { status: 302 });
      }
    } catch (error) {
      console.error('[ClickTracking] Error tracking homepage click:', error);
    }

    // Fallback redirect to homepage even if lead not found
    const defaultLocale = routing.defaultLocale;
    const redirectUrl = new URL(`/${defaultLocale}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Special handling for unsubscribe link (RFC 8058 one-click unsubscribe)
  if (linkId === 'unsubscribe') {
    try {
      const lead = await leadService.getLeadById(leadId);

      if (lead) {
        // Unsubscribe the lead
        await leadService.unsubscribe(leadId);
        console.log('[ClickTracking] Lead unsubscribed:', leadId);
      }

      // Return simple HTML confirmation page
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed - Mythoria</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FAF7F1;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h1 {
      color: #014A70;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #1E2B44;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    a {
      color: #014A70;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You've been unsubscribed</h1>
    <p>We're sad to see you go, but we understand. Your email has been removed from our mailing list.</p>
    <p>If you ever need us, we're always here to help you preserve and share your most cherished memories.</p>
    <p><a href="https://mythoria.pt">Return to Mythoria</a></p>
  </div>
</body>
</html>
      `;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    } catch (error) {
      console.error('[ClickTracking] Error processing unsubscribe:', error);

      // Return error page
      const errorHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Mythoria</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #FAF7F1;
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      max-width: 500px;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    h1 {
      color: #014A70;
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      color: #1E2B44;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    a {
      color: #014A70;
      text-decoration: none;
      font-weight: 600;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Something went wrong</h1>
    <p>We encountered an error while processing your request. Please try again or contact us if the problem persists.</p>
    <p><a href="https://mythoria.pt">Return to Mythoria</a></p>
  </div>
</body>
</html>
      `;

      return new NextResponse(errorHtml, {
        status: 500,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
  }

  try {
    // Get lead data
    const lead = await leadService.getLeadById(leadId);

    if (!lead) {
      console.warn('[ClickTracking] Lead not found:', leadId);
      // Still redirect to avoid broken experience, but don't set session
      const defaultLocale = routing.defaultLocale;
      const redirectUrl = new URL(`/${defaultLocale}/${linkId}`, request.url);
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
    const redirectUrl = new URL(redirectPath, request.url);

    console.log('[ClickTracking] Redirecting:', {
      leadId,
      linkId,
      locale,
      redirectPath,
    });

    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (error) {
    console.error('[ClickTracking] Error processing click:', error);

    // Fallback redirect to avoid broken links
    const defaultLocale = routing.defaultLocale;
    const redirectUrl = new URL(`/${defaultLocale}/${linkId}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }
}

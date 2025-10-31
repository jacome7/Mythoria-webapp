import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@/db/services/leads';
import type { BounceWebhookPayload } from '@/types/lead';

/**
 * Bounce API
 * POST /api/deliverability/bounce
 *
 * Handles bounce notifications from Google Apps Script (or other bounce processors)
 * Updates lead status to hard_bounce or soft_bounce
 *
 * Requires Bearer token authentication via LEAD_BOUNCE_API_SECRET env var
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.LEAD_BOUNCE_API_SECRET;

    if (!expectedToken) {
      console.error('[BounceAPI] LEAD_BOUNCE_API_SECRET not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (token !== expectedToken) {
      console.warn('[BounceAPI] Invalid API token attempt');
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    // Parse request body
    const body = (await request.json()) as BounceWebhookPayload;

    // Validate payload
    if (!body.type || !['hard', 'soft'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid bounce type. Must be "hard" or "soft"' },
        { status: 400 },
      );
    }

    if (!body.lead_id && !body.email) {
      return NextResponse.json(
        { error: 'Either lead_id or email must be provided' },
        { status: 400 },
      );
    }

    // Find the lead
    let lead = null;
    if (body.lead_id) {
      lead = await leadService.getLeadById(body.lead_id);
    } else if (body.email) {
      lead = await leadService.getLeadByEmail(body.email);
    }

    if (!lead) {
      return NextResponse.json(
        {
          error: 'Lead not found',
          details: body.lead_id
            ? `No lead found with ID: ${body.lead_id}`
            : `No lead found with email: ${body.email}`,
        },
        { status: 404 },
      );
    }

    // Record the bounce
    const updated = await leadService.recordBounce(lead.id, body.type, body.reason);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update lead status' }, { status: 500 });
    }

    console.log('[BounceAPI] Bounce recorded successfully:', {
      leadId: lead.id,
      email: lead.email,
      type: body.type,
      reason: body.reason,
    });

    return NextResponse.json({
      success: true,
      lead_id: lead.id,
      email: lead.email,
      status: updated.emailStatus,
      message: 'Bounce recorded successfully',
    });
  } catch (error) {
    console.error('[BounceAPI] Error processing bounce:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS handler for CORS preflight (if needed)
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * GET handler - returns API documentation
 */
export async function GET() {
  const docs = {
    endpoint: '/api/deliverability/bounce',
    method: 'POST',
    description: 'Record email bounce events for marketing leads',
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <LEAD_BOUNCE_API_SECRET>',
    },
    request: {
      content_type: 'application/json',
      body: {
        lead_id: 'UUID (optional if email provided) - The unique lead identifier',
        email: 'string (optional if lead_id provided) - The lead email address',
        type: '"hard" | "soft" (required) - Type of bounce',
        reason: 'string (optional) - Bounce reason from DSN',
      },
    },
    responses: {
      '200': {
        description: 'Bounce recorded successfully',
        example: {
          success: true,
          lead_id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          status: 'hard_bounce',
          message: 'Bounce recorded successfully',
        },
      },
      '400': 'Bad request - Invalid payload',
      '401': 'Unauthorized - Invalid or missing API token',
      '404': 'Lead not found',
      '500': 'Internal server error',
    },
    examples: {
      curl: `curl -X POST https://mythoria.pt/api/deliverability/bounce \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_SECRET" \\
  -d '{"lead_id": "123e4567-e89b-12d3-a456-426614174000", "type": "hard", "reason": "Mailbox does not exist"}'`,
      google_apps_script: `const response = UrlFetchApp.fetch('https://mythoria.pt/api/deliverability/bounce', {
  method: 'post',
  contentType: 'application/json',
  headers: {
    'Authorization': 'Bearer YOUR_API_SECRET'
  },
  payload: JSON.stringify({
    email: 'bounced@example.com',
    type: 'hard',
    reason: 'Mailbox does not exist'
  })
});`,
    },
  };

  return NextResponse.json(docs, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

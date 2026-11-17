import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getEnvironmentConfig } from '@/config/environment';
import { db } from '@/db';
import { getCurrentAuthor } from '@/lib/auth';
import { resolveAdContextSafely } from '@/lib/openai-ads/context';
import { conversions } from '@/lib/openai-ads/events';
import { enqueueAdConversion } from '@/lib/openai-ads/outbox';

// Contact form validation schema
const ContactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  category: z.string().optional(),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
});

// Get configuration
const config = getEnvironmentConfig();

/** The signed-in author, if any; the form is public, so failures resolve to anonymous. */
async function optionalAuthorId(): Promise<string | null> {
  try {
    return (await getCurrentAuthor())?.authorId ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ContactFormSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { name, email, category, message } = validationResult.data;

    // Map category values to match backend expectations
    const categoryMapping: Record<string, string> = {
      feature_ideas: 'Feature request',
      bug_report: 'Bug',
      technical_issues: 'Story failure',
      delivery: 'Delivery',
      credits: 'Credits',
      business_partnership: 'Business partner',
      general: 'General',
    };

    // Create ticket in admin system with API key authentication
    const ticketResponse = await fetch(`${config.admin.apiUrl}/api/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.admin.apiKey, // Use API key authentication
      },
      body: JSON.stringify({
        category: 'contact',
        email: email,
        name: name,
        type: categoryMapping[category || ''] || 'General',
        message: message,
        // Note: userId will be null for anonymous contacts - this is handled in the API
      }),
    });

    if (!ticketResponse.ok) {
      const errorText = await ticketResponse.text();
      console.error('Failed to create ticket:', errorText);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create support ticket',
          details: `Ticket creation error: ${ticketResponse.status}`,
        },
        { status: 500 },
      );
    }

    const ticketData = await ticketResponse.json();
    console.log('Ticket created successfully:', ticketData.id);

    // OpenAI Ads conversion; never blocks or fails the submission.
    let adEventId: string | undefined;
    const ticketId =
      typeof ticketData?.id === 'string' || typeof ticketData?.id === 'number'
        ? String(ticketData.id)
        : undefined;
    if (ticketId) {
      const authorId = await optionalAuthorId();
      const adConversion = conversions.contactSubmitted(ticketId);
      adEventId = adConversion.eventId;
      await enqueueAdConversion(db, {
        conversion: adConversion,
        authorId,
        adContext: await resolveAdContextSafely({
          headers: request.headers,
          cookies: request.cookies,
          authorId,
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId: ticketData.id,
      ...(adEventId ? { adEventId } : {}),
    });
  } catch (error) {
    console.error('Contact form API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getTranslations } from 'next-intl/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService, storyService } from '@/db/services';
import { SELF_PRINTING_SERVICE_CODE } from '@/constants/pricing';
import { resolveServerAnalyticsContext } from '@/lib/analytics/server-context';
import { InsufficientProductCreditsError, startProductGeneration } from '@/lib/product-generation';
import { launchSelfPrintWorkflow } from '@/lib/product-launch';

interface SelfPrintRequestBody {
  email?: string;
  emails?: string[];
  ccAccountEmail?: boolean;
  generateCMYK?: boolean;
  analyticsContext?: unknown;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> },
) {
  const author = await getCurrentAuthor();

  if (!author) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { storyId } = await params;

  let body: SelfPrintRequestBody = {};
  try {
    body = (await request.json()) as SelfPrintRequestBody;
  } catch {
    body = {};
  }

  const requestedEmails: string[] = [];
  if (Array.isArray(body.emails)) {
    requestedEmails.push(...body.emails);
  }
  if (body.email) {
    requestedEmails.push(body.email);
  }

  const normalizedRequestedEmails: string[] = [];
  const seenEmails = new Set<string>();
  for (const email of requestedEmails) {
    const trimmed = email?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seenEmails.has(key)) continue;
    seenEmails.add(key);
    normalizedRequestedEmails.push(trimmed);
  }

  const invalidEmails = normalizedRequestedEmails.filter((email) => !EMAIL_REGEX.test(email));
  if (invalidEmails.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Please double-check these email addresses: ${invalidEmails.join(', ')}`,
      },
      { status: 400 },
    );
  }

  if (!author.email) {
    return NextResponse.json(
      {
        success: false,
        error: 'We could not find your account email. Update your profile and try again.',
      },
      { status: 400 },
    );
  }

  try {
    const story = await storyService.getStoryById(storyId);
    if (!story) {
      return NextResponse.json({ success: false, error: 'Story not found.' }, { status: 404 });
    }

    if (story.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Only published stories can be downloaded.' },
        { status: 409 },
      );
    }

    const isOwner = story.authorId === author.authorId;
    if (!isOwner && !story.isPublic) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have access to download this story.',
        },
        { status: 403 },
      );
    }

    const pricing = await pricingService.getPricingByServiceCode(SELF_PRINTING_SERVICE_CODE);
    if (!pricing) {
      return NextResponse.json(
        { success: false, error: 'Self-print pricing not configured.' },
        { status: 500 },
      );
    }

    const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
    const analytics = await resolveServerAnalyticsContext({
      browserContext: body.analyticsContext,
      attributionId: request.cookies.get('mythoria_attribution')?.value,
      authorId: author.authorId,
      storedConsentValue: request.cookies.get('mythoria_consent')?.value,
    });
    const started = await startProductGeneration({
      actionType: 'self_print',
      authorId: author.authorId,
      userId: author.clerkUserId,
      storyId,
      idempotencyKey: request.headers.get('idempotency-key')?.trim() || randomUUID(),
      creditsSpent: pricing.credits,
      creditEventType: 'selfPrinting',
      attributionId: analytics.attributionId,
      analyticsContext: analytics.context,
      analyticsConsent: analytics.consent,
      primaryIntent: analytics.primaryIntent,
      landingSlug: analytics.landingSlug,
    });
    const workflowId = started.request.runId;

    if (started.request.status === 'failed') {
      return NextResponse.json(
        { success: false, error: 'Previous self-print request failed; retry the request' },
        { status: 409 },
      );
    }
    if (started.request.status !== 'pending') {
      return NextResponse.json({
        success: true,
        storyId,
        workflowId,
        executionId: started.request.queueReference || '',
        message: 'Self-print workflow already started',
        recipients: normalizedRequestedEmails,
        creditsDeducted: pricing.credits,
        balance: { previous: currentBalance, current: started.remainingCredits },
      });
    }

    const launched = await launchSelfPrintWorkflow({
      storyId,
      workflowId,
      locale: story.storyLanguage || 'en-US',
      recipients: normalizedRequestedEmails.map((email) => ({ email })),
      generateCMYK: body.generateCMYK !== false,
      requestedByAuthorId: author.authorId,
      requestedByEmail: author.email,
    });
    if (!launched.ok) {
      const t = await getTranslations({
        locale: author.preferredLocale || 'en-US',
        namespace: 'SelfPrintModal',
      });

      return NextResponse.json(
        {
          success: false,
          error: t('errors.workflowQueueFailed'),
          creditsDeducted: 0,
        },
        { status: 502 },
      );
    }
    const workflowResult = launched.result;

    return NextResponse.json({
      success: true,
      storyId,
      workflowId: workflowResult.workflowId ?? workflowId,
      executionId: workflowResult.executionId,
      message: workflowResult.message ?? 'Self-print workflow started',
      recipients: workflowResult.recipients,
      creditsDeducted: pricing.credits,
      balance: {
        previous: currentBalance,
        current: started.remainingCredits,
      },
    });
  } catch (error) {
    if (error instanceof InsufficientProductCreditsError) {
      const pricing = await pricingService.getPricingByServiceCode(SELF_PRINTING_SERVICE_CODE);
      const required = pricing?.credits ?? 0;
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required,
          available: error.available,
          shortfall: Math.max(0, required - error.available),
        },
        { status: 402 },
      );
    }
    console.error('Error handling self-print request', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

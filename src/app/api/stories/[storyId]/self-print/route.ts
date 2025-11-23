import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getTranslations } from 'next-intl/server';
import { getCurrentAuthor } from '@/lib/auth';
import { creditService, pricingService, storyService } from '@/db/services';
import { sgwFetch } from '@/lib/sgw-client';
import { SELF_PRINTING_SERVICE_CODE } from '@/constants/pricing';

interface SelfPrintRequestBody {
  email?: string;
  emails?: string[];
  ccAccountEmail?: boolean;
  generateCMYK?: boolean;
}

interface SelfPrintWorkflowSuccessResponse {
  success: true;
  storyId: string;
  workflowId: string;
  executionId: string;
  recipients: string[];
  message?: string;
}

interface SelfPrintWorkflowErrorResponse {
  success: false;
  error?: string;
  message?: string;
}

type SelfPrintWorkflowResponse = SelfPrintWorkflowSuccessResponse | SelfPrintWorkflowErrorResponse;

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
    if (currentBalance < pricing.credits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient credits',
          required: pricing.credits,
          available: currentBalance,
          shortfall: pricing.credits - currentBalance,
        },
        { status: 402 },
      );
    }

    await creditService.deductCredits(author.authorId, pricing.credits, 'selfPrinting', storyId);

    const workflowId = uuidv4();
    const recipientPayload = normalizedRequestedEmails.map((email) => ({ email }));
    let workflowResult: SelfPrintWorkflowSuccessResponse;
    try {
      const workflowResponse = await sgwFetch('/print/self-service', {
        method: 'POST',
        body: JSON.stringify({
          storyId,
          workflowId,
          recipients: recipientPayload.length ? recipientPayload : undefined,
          includeAuthorEmail: true,
          locale: story.storyLanguage || 'en-US',
          generateCMYK: body.generateCMYK !== false,
          metadata: {
            requestSource: 'webapp',
            requestedByAuthorId: author.authorId,
            requestedByEmail: author.email,
            storyTitle: story.title,
          },
        }),
      });

      const parsed = (await workflowResponse.json()) as SelfPrintWorkflowResponse;

      if (!workflowResponse.ok || !parsed.success) {
        console.error('Self-print workflow enqueue failed', {
          storyId,
          status: workflowResponse.status,
          response: parsed,
        });

        // Refund credits
        await creditService.addCredits(author.authorId, pricing.credits, 'refund');

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

      workflowResult = parsed;
    } catch (error) {
      console.error('Self-print workflow threw', { storyId, error });

      // Refund credits
      await creditService.addCredits(author.authorId, pricing.credits, 'refund');

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

    const newBalance = await creditService.getAuthorCreditBalance(author.authorId);

    console.info('[SelfPrint] Workflow queued', {
      storyId,
      workflowId: workflowResult.workflowId ?? workflowId,
      executionId: workflowResult.executionId,
      recipients: workflowResult.recipients,
    });

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
        current: newBalance,
      },
    });
  } catch (error) {
    console.error('Error handling self-print request', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

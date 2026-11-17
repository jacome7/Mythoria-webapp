import { NextRequest } from 'next/server';
import { db } from '@/db';
import { promotionCodeService } from '@/db/services';
import { getCurrentAuthor } from '@/lib/auth';
import { resolveAdContextSafely } from '@/lib/openai-ads/context';
import { conversions } from '@/lib/openai-ads/events';
import { enqueueAdConversion } from '@/lib/openai-ads/outbox';

export async function POST(req: NextRequest) {
  try {
    const author = await getCurrentAuthor();
    if (!author) {
      return Response.json(
        { error: { code: 'auth_required', message: 'Authentication required.' } },
        { status: 401 },
      );
    }
    const body = await req.json().catch(() => ({}));
    const code: string = body.code || '';

    const result = await promotionCodeService.redeem(author.authorId, code);
    if (!result.ok) {
      // Per requirement: use generic invalid code messaging for all failures
      return Response.json(
        { error: { code: 'invalid_code', message: 'Invalid or inactive code.' } },
        { status: 400 },
      );
    }

    let adEventId: string | undefined;
    if (result.redemptionId) {
      const adConversion = conversions.promoCodeRedeemed(result.redemptionId);
      adEventId = adConversion.eventId;
      await enqueueAdConversion(db, {
        conversion: adConversion,
        authorId: author.authorId,
        adContext: await resolveAdContextSafely({
          headers: req.headers,
          cookies: req.cookies,
          authorId: author.authorId,
        }),
      });
    }

    // Do not return a localized success message here; clients handle localization via next-intl.
    return Response.json({
      code: result.code,
      creditsGranted: result.creditsGranted,
      newBalance: result.balance,
      ...(adEventId ? { adEventId } : {}),
    });
  } catch (err) {
    console.error('redeem code error', err);
    return Response.json(
      { error: { code: 'server_error', message: 'Unexpected error.' } },
      { status: 500 },
    );
  }
}

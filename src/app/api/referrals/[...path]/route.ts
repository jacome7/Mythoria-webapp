import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { referralService } from '@/db/services/referrals';
import {
  customerReferralView,
  privateJson,
  referralConsent,
  referralHttpError,
  requireReferralCustomer,
  requireSameOrigin,
} from '@/lib/referrals/http';
import {
  referralCodeSchema,
  referralFlags,
  ReferralError,
  REFERRAL_POLICY,
  REFERRAL_ATTRIBUTION_COOKIE,
  REFERRAL_VISITOR_COOKIE,
} from '@/lib/referrals/policy';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    const path = (await context.params).path.join('/');
    if (path !== 'me') throw new ReferralError('not_found', 404);
    const author = await requireReferralCustomer(request);
    return privateJson(await customerReferralView(author.authorId));
  } catch (error) {
    return referralHttpError(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    requireSameOrigin(request);
    const path = (await context.params).path.join('/');
    if (path === 'clear') {
      const response = privateJson({ success: true });
      response.cookies.delete(REFERRAL_ATTRIBUTION_COOKIE);
      response.cookies.delete(REFERRAL_VISITOR_COOKIE);
      return response;
    }
    const flags = referralFlags();
    if (!flags.program) throw new ReferralError('not_found', 404);
    if (path === 'capture') {
      if (!flags.capture) throw new ReferralError('not_found', 404);
      if (!referralConsent(request.cookies.get('mythoria_consent')?.value))
        throw new ReferralError('referral_consent_required', 403);
      const body = z
        .object({
          code: referralCodeSchema,
          requestId: z.uuid(),
          locale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']),
        })
        .parse(await request.json());
      const existing = z.uuid().safeParse(request.cookies.get(REFERRAL_VISITOR_COOKIE)?.value);
      const visitor = existing.success ? existing.data : randomUUID();
      const visit = await referralService.capture(body.code, visitor, body.locale, body.requestId);
      const response = privateJson({ success: true });
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: REFERRAL_POLICY.attributionDays * 86400,
      };
      response.cookies.set(REFERRAL_VISITOR_COOKIE, visit.anonymousVisitorId, options);
      response.cookies.set(REFERRAL_ATTRIBUTION_COOKIE, visit.referralVisitId, options);
      return response;
    }
    const author = await requireReferralCustomer(request);
    if (path === 'link') return privateJson(await customerReferralView(author.authorId));
    if (path === 'me/change') {
      const body = z
        .object({ code: referralCodeSchema, confirmed: z.literal(true) })
        .parse(await request.json());
      await referralService.assign(author.authorId, body.code, body.confirmed);
      return privateJson(await customerReferralView(author.authorId));
    }
    throw new ReferralError('not_found', 404);
  } catch (error) {
    return referralHttpError(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveReferral, referralService } from '@/db/services/referrals';
import { getCurrentAuthor } from '@/lib/auth';
import { referralLogger } from './logger';
import {
  REFERRAL_ATTRIBUTION_COOKIE,
  REFERRAL_VISITOR_COOKIE,
  ReferralError,
  referralFlags,
} from './policy';

export function referralConsent(value?: string): boolean {
  if (!value) return false;
  try {
    const consent = JSON.parse(decodeURIComponent(value));
    return (
      consent.version === 3 &&
      consent.preferences?.referrals === true &&
      Number.isFinite(consent.timestamp) &&
      consent.timestamp <= Date.now() &&
      Date.now() - consent.timestamp < 365 * 86400000
    );
  } catch {
    return false;
  }
}
export function privateJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
export function referralHttpError(error: unknown) {
  if (error instanceof ReferralError) return privateJson({ error: error.code }, error.status);
  if (error instanceof z.ZodError) return privateJson({ error: 'invalid_input' }, 400);
  referralLogger.error('request_failed', { errorCode: 'internal_error' });
  return privateJson({ error: 'internal_error' }, 500);
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
  if (!origin || origin !== new URL(allowed).origin)
    throw new ReferralError('forbidden_origin', 403);
}
export async function linkReferralFromRequest(request: NextRequest, authorId: string) {
  if (!referralFlags().program || !referralConsent(request.cookies.get('mythoria_consent')?.value))
    return;
  const visit = request.cookies.get(REFERRAL_ATTRIBUTION_COOKIE)?.value;
  const visitor = request.cookies.get(REFERRAL_VISITOR_COOKIE)?.value;
  if (!z.uuid().safeParse(visit).success || !z.uuid().safeParse(visitor).success) return;
  try {
    await referralService.link(authorId, visit!, visitor!);
  } catch (error) {
    if (error instanceof ReferralError && error.status < 500) return;
    throw error;
  }
}
export async function requireReferralCustomer(request: NextRequest) {
  if (!referralFlags().program) throw new ReferralError('not_found', 404);
  const author = await getCurrentAuthor();
  if (!author) throw new ReferralError('auth_required', 401);
  await linkReferralFromRequest(request, author.authorId);
  return author;
}
export async function customerReferralView(authorId: string) {
  const row = await getActiveReferral(authorId);
  return {
    activeCode: row?.code.code ?? null,
    activatedAt: row?.assignment.activatedAt ?? null,
    ownerStatus: row?.owner.status ?? null,
    appliesProspectively: true,
  };
}

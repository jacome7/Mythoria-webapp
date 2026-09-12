import { NextRequest } from 'next/server';
import { referralOwnerMemberships, requireReferralOwnerSession } from '@/lib/referrals/portal';
import { privateJson, referralHttpError } from '@/lib/referrals/http';
import {
  referralSummary,
  referralTransactions,
  referralSettlementHistory,
  referralConversionHistory,
  referralStatement,
} from '@/db/services/referral-reporting';
import { ReferralError } from '@/lib/referrals/policy';
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;
    if (action === 'memberships')
      return privateJson((await referralOwnerMemberships()).memberships);
    const session = await requireReferralOwnerSession(
      request.nextUrl.searchParams.get('membership') || undefined,
    );
    const filter = Object.fromEntries(request.nextUrl.searchParams);
    if (action === 'statement')
      return privateJson(
        await referralStatement(
          session.referralOwnerId,
          request.nextUrl.searchParams.get('id') || '',
        ),
      );
    if (action === 'summary' || action === 'visits')
      return privateJson(await referralSummary(session.referralOwnerId, filter));
    if (action === 'commissions')
      return privateJson(await referralTransactions(session.referralOwnerId, filter));
    if (action === 'settlements')
      return privateJson(await referralSettlementHistory(session.referralOwnerId, filter));
    if (action === 'conversions')
      return privateJson(await referralConversionHistory(session.referralOwnerId, filter));
    throw new ReferralError('not_found', 404);
  } catch (error) {
    return referralHttpError(error);
  }
}

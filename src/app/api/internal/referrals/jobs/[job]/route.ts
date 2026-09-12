import { verifyReferralServiceIdentity } from '@/lib/referrals/admin-api';
import { privateJson, referralHttpError } from '@/lib/referrals/http';
import { ReferralError } from '@/lib/referrals/policy';
import {
  closeReferralMonth,
  drainReferralOutbox,
  matureCommissions,
  reconcileReferrals,
  retryReferralPayments,
} from '@/lib/referrals/jobs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  try {
    await verifyReferralServiceIdentity(request, 'scheduler');
    const { job } = await params;
    if (job === 'drain')
      return privateJson({
        payments: await retryReferralPayments(),
        notifications: await drainReferralOutbox(),
      });
    if (job === 'mature') return privateJson({ approved: await matureCommissions() });
    if (job === 'close') return privateJson(await closeReferralMonth());
    if (job === 'reconcile')
      return privateJson(await reconcileReferrals(new Date(Date.now() - 86400000), new Date()));
    throw new ReferralError('not_found', 404);
  } catch (error) {
    return referralHttpError(error);
  }
}

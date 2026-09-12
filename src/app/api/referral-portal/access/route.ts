import { hasReferralOwnerAccess } from '@/lib/referrals/portal';
import { privateJson, referralHttpError } from '@/lib/referrals/http';

export async function GET() {
  try {
    return privateJson({ hasAccess: await hasReferralOwnerAccess() });
  } catch (error) {
    return referralHttpError(error);
  }
}

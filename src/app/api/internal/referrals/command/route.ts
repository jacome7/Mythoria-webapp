import {
  referralCommandSchema,
  executeReferralCommand,
  verifyReferralServiceIdentity,
} from '@/lib/referrals/admin-api';
import { privateJson, referralHttpError } from '@/lib/referrals/http';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    await verifyReferralServiceIdentity(request, 'admin');
    const command = referralCommandSchema.parse(await request.json());
    return privateJson({
      data: (await executeReferralCommand(command.operation, command.input, command.actor)) ?? {
        success: true,
      },
    });
  } catch (error) {
    return referralHttpError(error);
  }
}

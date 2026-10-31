import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import {
  getEntitlementForAuthor,
  listEligibleStories,
  OPEN_REWARD_STATUSES,
} from '@/db/services/survey-rewards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Owner-only view of a reward: its state, the study policy and the stories it can be used on. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entitlementId: string }> },
) {
  try {
    const author = await getCurrentAuthor();
    if (!author) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { entitlementId } = await params;
    // Same answer for "does not exist" and "belongs to someone else".
    if (!UUID.test(entitlementId))
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const view = await getEntitlementForAuthor(entitlementId, author.authorId);
    if (!view) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const { entitlement, policy } = view;
    const isOpen = (OPEN_REWARD_STATUSES as readonly string[]).includes(entitlement.status);
    const stories = isOpen ? await listEligibleStories(author.authorId) : [];

    return NextResponse.json(
      {
        entitlement: {
          entitlementId: entitlement.entitlementId,
          status: entitlement.status,
          rewardType: entitlement.rewardType,
          storyId: entitlement.storyId,
          expiresAt: entitlement.expiresAt,
          deliveredAt: entitlement.deliveredAt,
          hasFailed: entitlement.status === 'failed',
        },
        policy: {
          rewardTypes: policy.rewardTypes,
          allowExistingAudiobook: policy.allowExistingAudiobook,
        },
        stories,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Error loading survey reward:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

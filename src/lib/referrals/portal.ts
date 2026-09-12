import { currentUser } from '@clerk/nextjs/server';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';
import {
  referralMemberships,
  referralOwners,
  referralAssignments,
  referralAuditEvents,
} from '@/db/schema/referrals';
import { referralLock } from '@/db/services/referrals';
import { ReferralError, referralFlags } from './policy';

// Menu discovery must not activate invitations or modify customer attribution.
export async function hasReferralOwnerAccess(): Promise<boolean> {
  if (!referralFlags().portal) return false;
  const user = await currentUser();
  if (!user) return false;
  const emails = user.emailAddresses
    .filter((email) => email.verification?.status === 'verified')
    .map((email) => email.emailAddress.trim().toLowerCase());
  if (!emails.length) return false;
  const rows = await db
    .select({ membershipId: referralMemberships.membershipId })
    .from(referralMemberships)
    .innerJoin(
      referralOwners,
      eq(referralOwners.referralOwnerId, referralMemberships.referralOwnerId),
    )
    .where(
      and(
        eq(referralOwners.status, 'active'),
        inArray(referralMemberships.emailNormalized, emails),
        or(
          and(
            eq(referralMemberships.status, 'active'),
            eq(referralMemberships.clerkUserId, user.id),
          ),
          and(eq(referralMemberships.status, 'invited'), isNull(referralMemberships.clerkUserId)),
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export async function referralOwnerMemberships() {
  if (!referralFlags().portal) throw new ReferralError('not_found', 404);
  const user = await currentUser();
  if (!user) throw new ReferralError('auth_required', 401);
  const emails = user.emailAddresses
    .filter((email) => email.verification?.status === 'verified')
    .map((email) => email.emailAddress.trim().toLowerCase());
  if (!emails.length) throw new ReferralError('verified_email_required', 403);
  await db.transaction(async (tx) => {
    await referralLock(tx, `membership:${user.id}`);
    const invited = await tx
      .select({ membership: referralMemberships })
      .from(referralMemberships)
      .innerJoin(
        referralOwners,
        eq(referralOwners.referralOwnerId, referralMemberships.referralOwnerId),
      )
      .where(
        and(
          inArray(referralMemberships.emailNormalized, emails),
          eq(referralMemberships.status, 'invited'),
          isNull(referralMemberships.clerkUserId),
          eq(referralOwners.status, 'active'),
        ),
      )
      .for('update');
    if (!invited.length) return;
    const [author] = await tx
      .select({ authorId: authors.authorId })
      .from(authors)
      .where(eq(authors.clerkUserId, user.id));
    if (author) {
      await referralLock(tx, `customer:${author.authorId}`);
      await tx
        .update(referralAssignments)
        .set({ endedAt: new Date(), endedReason: 'partner_membership_activated' })
        .where(
          and(
            eq(referralAssignments.authorId, author.authorId),
            isNull(referralAssignments.endedAt),
          ),
        );
    }
    for (const { membership } of invited) {
      await tx
        .update(referralMemberships)
        .set({ clerkUserId: user.id, status: 'active', activatedAt: new Date() })
        .where(eq(referralMemberships.membershipId, membership.membershipId));
      await tx.insert(referralAuditEvents).values({
        entityId: membership.membershipId,
        action: 'membership_activated',
        actorType: 'customer',
        actorId: user.id,
      });
    }
  });
  const memberships = await db
    .select({
      membershipId: referralMemberships.membershipId,
      referralOwnerId: referralMemberships.referralOwnerId,
      role: referralMemberships.role,
      displayName: referralOwners.displayName,
    })
    .from(referralMemberships)
    .innerJoin(
      referralOwners,
      eq(referralOwners.referralOwnerId, referralMemberships.referralOwnerId),
    )
    .where(
      and(
        eq(referralMemberships.clerkUserId, user.id),
        inArray(referralMemberships.emailNormalized, emails),
        eq(referralMemberships.status, 'active'),
        eq(referralOwners.status, 'active'),
      ),
    );
  if (!memberships.length) throw new ReferralError('membership_required', 403);
  return { clerkUserId: user.id, memberships };
}
export async function requireReferralOwnerSession(membershipId?: string) {
  const session = await referralOwnerMemberships();
  const selected = membershipId
    ? session.memberships.find((member) => member.membershipId === membershipId)
    : session.memberships[0];
  if (!selected) throw new ReferralError('forbidden', 403);
  await db
    .update(referralMemberships)
    .set({ lastLoginAt: new Date() })
    .where(eq(referralMemberships.membershipId, selected.membershipId));
  return { ...selected, clerkUserId: session.clerkUserId };
}
export async function suspendReferralMember(
  ownerId: string,
  membershipId: string,
  actorId: string,
) {
  return db.transaction(async (tx) => {
    const [member] = await tx
      .update(referralMemberships)
      .set({ status: 'suspended' })
      .where(
        and(
          eq(referralMemberships.referralOwnerId, ownerId),
          eq(referralMemberships.membershipId, membershipId),
        ),
      )
      .returning();
    if (!member) throw new ReferralError('not_found', 404);
    await tx.insert(referralAuditEvents).values({
      entityId: membershipId,
      action: 'membership_suspended',
      actorType: 'admin_ui',
      actorId,
    });
    return { success: true };
  });
}

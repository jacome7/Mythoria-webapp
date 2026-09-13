import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  referralCodes,
  referralMemberships,
  referralOwners,
  referralTerms,
} from '@/db/schema/referrals';
import { notificationClient } from '@/lib/notifications/client';
import { commissionCents, REFERRAL_POLICY } from './policy';

export function invitationVariables(input: {
  name: string;
  locale: string;
  code: string;
  rateBps: number;
  baseUrl: string;
}) {
  const origin = new URL(input.baseUrl).origin;
  const money = (cents: number) =>
    new Intl.NumberFormat(input.locale, {
      style: 'currency',
      currency: REFERRAL_POLICY.currency,
    }).format(cents / 100);
  const portalUrl = `${origin}/${input.locale}/referrals`;
  return {
    name: input.name,
    portalUrl,
    welcome: {
      code: input.code,
      referralUrl: `${origin}/r/${encodeURIComponent(input.code)}`,
      faqUrl: `${portalUrl}#referral-faq`,
      rate: new Intl.NumberFormat(input.locale, {
        style: 'percent',
        maximumFractionDigits: 2,
      }).format(input.rateBps / 10000),
      examplePayment: money(10000),
      exampleCommission: money(commissionCents(10000, input.rateBps)),
      days: REFERRAL_POLICY.attributionDays,
      hold: REFERRAL_POLICY.holdDays,
      minimum: money(REFERRAL_POLICY.minimumPaymentCents),
    },
  };
}

/** Missing membership means the invitation was revoked/deleted. Suspension is reversible. */
export async function sendReferralInvitation(membershipId: string, outboxId: string) {
  const [member] = await db
    .select()
    .from(referralMemberships)
    .where(eq(referralMemberships.membershipId, membershipId));
  if (!member) return 'cancelled' as const;
  const [owner] = await db
    .select()
    .from(referralOwners)
    .where(eq(referralOwners.referralOwnerId, member.referralOwnerId));
  if (!owner) throw new Error('missing_owner');
  if (owner.status === 'closed') return 'cancelled' as const;
  if (owner.status !== 'active' || member.status === 'suspended') return 'deferred' as const;
  const [code] = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.referralOwnerId, owner.referralOwnerId));
  if (!code) throw new Error('missing_referral_code');
  if (!code.active) return 'deferred' as const;
  const [terms] = await db
    .select()
    .from(referralTerms)
    .where(
      and(
        eq(referralTerms.referralOwnerId, owner.referralOwnerId),
        sql`${referralTerms.effectiveFrom} <= now() and (${referralTerms.effectiveUntil} is null or ${referralTerms.effectiveUntil} > now())`,
      ),
    )
    .limit(1);
  if (!terms) throw new Error('missing_referral_terms');
  const response = await notificationClient.sendTemplatedEmail({
    templateId: 'referral-invitation',
    recipients: [{ email: member.emailNormalized, language: owner.preferredLocale }],
    entityId: `${outboxId}:${member.membershipId}`,
    variables: invitationVariables({
      name: owner.displayName,
      locale: owner.preferredLocale,
      code: code.code,
      rateBps: terms.commissionRateBps,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt',
    }),
  });
  if (!response.success) throw new Error('notification_failed');
  return 'completed' as const;
}

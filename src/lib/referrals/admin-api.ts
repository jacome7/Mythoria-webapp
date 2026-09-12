import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import {
  referralActorSchema,
  referralFilterSchema,
  requireReferralPermission,
  ReferralError,
  type ReferralActor,
} from './policy';
import {
  referralService,
  reviewCommission,
  manualCommissionAdjustment,
  previewSettlement,
  createSettlement,
  markSettlementPaid,
} from '@/db/services/referrals';
import {
  referralSummary,
  referralTransactions,
  referralSettlementHistory,
} from '@/db/services/referral-reporting';
import { db } from '@/db';
import { referralReconciliations } from '@/db/schema/referrals';
import { desc } from 'drizzle-orm';
import { suspendReferralMember } from './portal';
const oidc = new OAuth2Client();
export async function verifyReferralServiceIdentity(request: Request, kind: 'admin' | 'scheduler') {
  const account =
    process.env[
      kind === 'admin' ? 'REFERRAL_ADMIN_SERVICE_ACCOUNT' : 'REFERRAL_SCHEDULER_SERVICE_ACCOUNT'
    ];
  const audience = process.env.REFERRAL_INTERNAL_AUDIENCE;
  const bearer = request.headers.get('authorization');
  if (!account || !audience || !bearer?.startsWith('Bearer '))
    throw new ReferralError('unauthorized', 401);
  try {
    const ticket = await oidc.verifyIdToken({ idToken: bearer.slice(7), audience });
    const payload = ticket.getPayload();
    if (payload?.email !== account || !payload.email_verified) throw new Error('identity');
  } catch {
    throw new ReferralError('unauthorized', 401);
  }
}
export const referralCommandSchema = z.object({
  operation: z.enum([
    'create_referral_owner',
    'get_referral_owner',
    'list_referral_owners',
    'update_referral_owner',
    'set_referral_owner_status',
    'set_referral_owner_rate',
    'invite_referral_owner_member',
    'suspend_referral_owner_member',
    'list_referral_commissions',
    'review_referral_commission',
    'create_referral_commission_adjustment',
    'preview_referral_settlement',
    'create_referral_settlement',
    'mark_referral_settlement_paid',
    'get_referral_reconciliation',
    'get_referral_summary',
    'list_referral_settlements',
  ]),
  input: z.unknown(),
  actor: referralActorSchema,
});
const idSchema = z.object({ id: z.uuid() });
const reasonSchema = z.string().trim().min(3).max(2000);
export async function executeReferralCommand(
  operation: z.infer<typeof referralCommandSchema>['operation'],
  input: unknown,
  actor: ReferralActor,
) {
  if (!['admin_ui', 'admin_mcp'].includes(actor.type))
    throw new ReferralError('forbidden_actor', 403);
  requireReferralPermission(actor, 'referrals:view');
  switch (operation) {
    case 'create_referral_owner':
      return referralService.createOwner(input, actor);
    case 'list_referral_owners':
      return referralService.listOwners();
    case 'get_referral_owner':
      return referralService.getOwner(idSchema.parse(input).id);
    case 'get_referral_summary': {
      const d = z.object({ id: z.uuid(), filters: referralFilterSchema.optional() }).parse(input);
      return referralSummary(d.id, d.filters || {});
    }
    case 'update_referral_owner': {
      const d = z
        .object({
          id: z.uuid(),
          displayName: z.string().trim().min(1).max(120).optional(),
          legalName: z.string().max(255).optional(),
          contactEmailNormalized: z.email().optional(),
          preferredLocale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']).optional(),
          countryCode: z
            .string()
            .regex(/^[A-Z]{2}$/)
            .optional(),
          code: z.string().optional(),
          codeActive: z.boolean().optional(),
        })
        .parse(input);
      const { id, ...values } = d;
      return referralService.updateOwner(id, values, actor);
    }
    case 'set_referral_owner_status': {
      const d = z
        .object({
          id: z.uuid(),
          status: z.enum(['active', 'suspended', 'closed']),
          reason: reasonSchema,
        })
        .parse(input);
      return referralService.setStatus(d.id, d.status, d.reason, actor);
    }
    case 'set_referral_owner_rate': {
      const d = z
        .object({
          id: z.uuid(),
          commissionRateBps: z.number().int().min(0).max(10000),
          effectiveFrom: z.iso.datetime(),
          reason: reasonSchema,
        })
        .parse(input);
      return referralService.setRate(
        d.id,
        d.commissionRateBps,
        new Date(d.effectiveFrom),
        d.reason,
        actor,
      );
    }
    case 'invite_referral_owner_member': {
      const d = z
        .object({
          id: z.uuid(),
          email: z.email(),
          role: z.enum(['owner', 'viewer']).default('owner'),
          requestId: z.uuid(),
        })
        .parse(input);
      return referralService.inviteMember(d.id, d.email, d.role, actor, d.requestId);
    }
    case 'suspend_referral_owner_member': {
      requireReferralPermission(actor, 'referrals:manage');
      const d = z.object({ id: z.uuid(), membershipId: z.uuid() }).parse(input);
      return suspendReferralMember(d.id, d.membershipId, actor.id);
    }
    case 'list_referral_commissions': {
      const d = z
        .object({ ownerId: z.uuid().optional(), filters: referralFilterSchema.optional() })
        .parse(input);
      return referralTransactions(d.ownerId || null, d.filters || {}, true);
    }
    case 'list_referral_settlements': {
      const d = z
        .object({ ownerId: z.uuid().optional(), filters: referralFilterSchema.optional() })
        .parse(input);
      return referralSettlementHistory(d.ownerId || null, d.filters || {}, true);
    }
    case 'review_referral_commission': {
      const d = z
        .object({
          id: z.uuid(),
          action: z.enum(['hold', 'release', 'cancel']),
          reason: reasonSchema,
        })
        .parse(input);
      return reviewCommission(d.id, d.action, d.reason, actor);
    }
    case 'create_referral_commission_adjustment': {
      const d = z
        .object({
          id: z.uuid(),
          amountCents: z
            .number()
            .int()
            .min(-2147483647)
            .max(2147483647)
            .refine((v) => v !== 0),
          reason: reasonSchema,
          requestId: z.uuid(),
        })
        .parse(input);
      return manualCommissionAdjustment(d.id, d.amountCents, d.reason, d.requestId, actor);
    }
    case 'preview_referral_settlement': {
      requireReferralPermission(actor, 'referrals:settle');
      const d = z.object({ ownerId: z.uuid(), periodEnd: z.iso.datetime() }).parse(input);
      return previewSettlement(d.ownerId, new Date(d.periodEnd));
    }
    case 'create_referral_settlement': {
      const d = z
        .object({ ownerId: z.uuid(), periodStart: z.iso.datetime(), periodEnd: z.iso.datetime() })
        .parse(input);
      return createSettlement(d.ownerId, new Date(d.periodStart), new Date(d.periodEnd), actor);
    }
    case 'mark_referral_settlement_paid': {
      const d = z
        .object({
          id: z.uuid(),
          amountCents: z.number().int().min(2000),
          externalPaymentReference: z.string().trim().min(1).max(255),
          paidAt: z.iso.datetime(),
        })
        .parse(input);
      return markSettlementPaid(
        d.id,
        d.amountCents,
        d.externalPaymentReference,
        new Date(d.paidAt),
        actor,
      );
    }
    case 'get_referral_reconciliation':
      return db
        .select()
        .from(referralReconciliations)
        .orderBy(desc(referralReconciliations.createdAt))
        .limit(30);
  }
}

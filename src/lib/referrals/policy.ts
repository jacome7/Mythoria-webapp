import { z } from 'zod';

export const REFERRAL_POLICY = Object.freeze({
  version: '2026-09-v1',
  defaultRateBps: 1000,
  attributionDays: 90,
  holdDays: 30,
  minimumPaymentCents: 2000,
  currency: 'EUR',
  timezone: 'Europe/Lisbon',
  retentionYears: 10,
});
export const REFERRAL_VISITOR_COOKIE = 'mythoria_referral_visitor';
export const REFERRAL_ATTRIBUTION_COOKIE = 'mythoria_referral_attribution';
export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_-]{4,31}$/);
export const referralPermissionSchema = z.enum([
  'referrals:view',
  'referrals:manage',
  'referrals:review',
  'referrals:settle',
]);
export type ReferralPermission = z.infer<typeof referralPermissionSchema>;
export const referralActorSchema = z.object({
  type: z.enum(['admin_ui', 'admin_mcp', 'system', 'customer', 'stripe']),
  id: z.string().min(1).max(255),
  permissions: z.array(referralPermissionSchema).default([]),
});
export type ReferralActor = z.infer<typeof referralActorSchema>;
export class ReferralError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
    this.name = 'ReferralError';
  }
}
export function requireReferralPermission(actor: ReferralActor, permission: ReferralPermission) {
  if (!actor.permissions.includes(permission)) throw new ReferralError('forbidden', 403);
}
export function referralFlags() {
  return {
    program: process.env.REFERRAL_PROGRAM_ENABLED === 'true',
    capture: process.env.REFERRAL_CAPTURE_ENABLED === 'true',
    commission: process.env.REFERRAL_COMMISSION_ENABLED === 'true',
    portal: process.env.REFERRAL_PORTAL_ENABLED === 'true',
    mode: process.env.REFERRAL_MODE === 'live' ? ('live' as const) : ('shadow' as const),
    pilotOwners: (process.env.REFERRAL_PILOT_OWNER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  };
}
export function modeForOwner(ownerId: string): 'shadow' | 'live' | null {
  const flags = referralFlags();
  if (!flags.program || !flags.commission) return null;
  if (flags.mode === 'live' && !flags.pilotOwners.includes(ownerId)) return null;
  return flags.mode;
}
export function commissionCents(basis: number, rateBps: number): number {
  if (
    !Number.isSafeInteger(basis) ||
    basis < 0 ||
    !Number.isInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > 10000
  ) {
    throw new ReferralError('invalid_commission_amount');
  }
  return Number((BigInt(basis) * BigInt(rateBps) + BigInt(5000)) / BigInt(10000));
}
export function cumulativeReversalCents(original: number, gross: number, refunded: number): number {
  if (![original, gross, refunded].every((v) => Number.isSafeInteger(v) && v >= 0))
    throw new ReferralError('invalid_refund_amount');
  if (!gross) return 0;
  return Number(
    (BigInt(original) * BigInt(Math.min(gross, refunded)) * BigInt(2) + BigInt(gross)) /
      (BigInt(gross) * BigInt(2)),
  );
}
export const ownerInputSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(255).optional(),
  contactEmail: z.email().transform((s) => s.trim().toLowerCase()),
  countryCode: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  preferredLocale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']).default('pt-PT'),
  code: referralCodeSchema,
  commissionRateBps: z.number().int().min(0).max(10000).default(1000),
  memberEmails: z
    .array(z.email().transform((s) => s.trim().toLowerCase()))
    .min(1)
    .max(20),
});
export const referralFilterSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    status: z
      .enum(['blocked', 'pending', 'approved', 'payable', 'paid', 'cancelled', 'reversed'])
      .optional(),
    purchase: z.enum(['first', 'repeat']).optional(),
    locale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']).optional(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
  })
  .refine((v) => !v.from || !v.to || v.from < v.to, { message: 'invalid_date_range' });

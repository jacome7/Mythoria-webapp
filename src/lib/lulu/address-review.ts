import { z } from 'zod';
import type { LuluShippingAddress } from './client';

const field = z.string().max(255).optional();
const suggestionSchema = z.object({
  street1: field,
  street2: field,
  city: field,
  postcode: field,
  state_code: field,
  country_code: field,
});
const addressFields = suggestionSchema.keyof().options;
export const luluAddressReviewSchema = z.object({
  proofVersion: z.number().int().positive(),
  suggested: suggestionSchema,
});
type Suggestion = z.infer<typeof suggestionSchema>;

export class LuluAddressReviewError extends Error {
  constructor(readonly suggested: Suggestion) {
    super('LULU_ADDRESS_CONFIRMATION_REQUIRED');
  }
}

function comparable(value: string, foldCase: boolean) {
  const clean = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  return foldCase ? clean.toLowerCase() : clean;
}

function hasAddressWarning(value: unknown): boolean {
  if (value && typeof value === 'object') return Object.values(value).some(hasAddressWarning);
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

export function checkLuluAddress(
  entered: LuluShippingAddress,
  proposed: Record<string, unknown> | null | undefined,
  warnings: unknown,
) {
  const changes: Suggestion = {};
  for (const field of addressFields) {
    const value = proposed?.[field];
    if (typeof value !== 'string') continue;
    const foldCase = field === 'city' || field === 'country_code' || field === 'state_code';
    if (comparable(value, foldCase) !== comparable(entered[field] ?? '', foldCase)) {
      // Do not put an arbitrary supplier payload, contact information or tax ID on a ticket.
      if (value.length > 255) throw new LuluAddressReviewError({});
      changes[field] = value.trim();
    }
  }
  if (Object.keys(changes).length || hasAddressWarning(warnings)) {
    throw new LuluAddressReviewError(changes);
  }
}

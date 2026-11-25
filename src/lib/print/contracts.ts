import { z } from 'zod';

export const providerSchema = z.enum(['manual', 'lulu']);
export const bindingSchema = z.enum(['paperback', 'hardcover']);
export const assetSchema = z.object({
  bucket: z.string().min(1),
  object: z.string().min(1),
  generation: z.string().regex(/^\d+$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().positive(),
});
export const proofSchema = z.object({
  interior: assetSchema,
  cover: assetSchema,
  pageCount: z.number().int().positive(),
  qaPassed: z.boolean(),
  qaCriticalCount: z.number().int().nonnegative(),
});
export const shippingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  street1: z.string().trim().min(1).max(255),
  street2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(120),
  postcode: z.string().trim().max(20),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  state_code: z.string().trim().max(120).optional(),
  phone_number: z.string().trim().max(30),
  email: z.string().trim().email().max(255),
  recipient_tax_id: z.string().trim().max(40).optional(),
});
export const quoteSchema = z.object({
  shippingLevel: z.string().min(1),
  totalEur: z.number().positive(),
  perCopyEur: z.number().positive(),
  confirmationId: z.string().uuid(),
  podPackageId: z.string().min(1),
});
export const vendorSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  tracking: z.array(z.string()).default([]),
  externalId: z.string().nullish(),
  orderId: z.union([z.string(), z.number()]).nullish(),
  environment: z.enum(['sandbox', 'production']).optional(),
  createdAt: z.iso.datetime().optional(),
  lines: z
    .array(
      z.object({
        external_id: z.string().nullish(),
        id: z.string().optional(),
        printable_id: z.union([z.string(), z.number()]).nullish(),
        carrier_name: z.string().nullish(),
        status: z
          .object({
            name: z.string(),
            changed: z.string().nullish(),
            messages: z
              .object({
                tracking_id: z.string().nullish(),
                carrier_name: z.string().nullish(),
                tracking_urls: z.array(z.string()).optional(),
              })
              .nullish(),
          })
          .nullish(),
        carrier: z.string().nullish(),
        tracking_id: z.string().nullish(),
        tracking_urls: z.array(z.string()).nullish(),
      }),
    )
    .optional(),
  costs: z
    .object({ currency: z.string(), total: z.number().positive(), fees: z.array(z.unknown()) })
    .optional(),
});
export const emailVariablesSchema = z.object({
  previousProofMayHaveSent: z.boolean().optional(),
  proofEmailAttempted: z.boolean().optional(),
  email: z.string().trim().email().max(255),
  name: z.string(),
  OrderNumber: z.string(),
  OrderDate: z.string(),
  CreditCost: z.number(),
  numberOfCopies: z.number(),
  storyTitle: z.string(),
  CoverImageURL: z.string(),
  line1: z.string(),
  line2: z.string(),
  city: z.string(),
  stateRegion: z.string(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string(),
  listenURL: z.string(),
  contactURL: z.string(),
  language: z.string(),
});
export type PrintAsset = z.infer<typeof assetSchema>;
export type PrintProof = z.infer<typeof proofSchema>;
export type PrintProvider = z.infer<typeof providerSchema>;
export type PrintBinding = z.infer<typeof bindingSchema>;
export type PrintVendor = z.infer<typeof vendorSchema>;

export class PrintError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 409,
  ) {
    super(message);
  }
}

export function luluPageCountSupported(binding: PrintBinding, count: number) {
  return count >= (binding === 'hardcover' ? 24 : 32) && count <= 800;
}

export function luluPackageId(binding: PrintBinding) {
  const value =
    process.env[
      binding === 'hardcover' ? 'LULU_HARDCOVER_POD_PACKAGE_ID' : 'LULU_PAPERBACK_POD_PACKAGE_ID'
    ]?.trim();
  if (!value) throw new PrintError('lulu_not_configured', 'Lulu product is not configured.', 503);
  return value;
}

export type PrintShippingAddress = z.infer<typeof shippingSchema>;

export function validateLuluShipping(shipping: PrintShippingAddress) {
  const taxRequired = ['BR', 'CL', 'MX'].includes(shipping.country_code);
  const stateRequired = ['AU', 'CA', 'US'].includes(shipping.country_code);
  if (
    !shipping.phone_number ||
    !shipping.postcode ||
    (taxRequired && !shipping.recipient_tax_id) ||
    (stateRequired && !shipping.state_code)
  ) {
    throw new PrintError(
      'shipping_details_required',
      'Complete the required shipping details.',
      400,
    );
  }
}

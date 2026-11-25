import { z } from 'zod';
import { luluConfigured } from '@/lib/lulu/client';
import {
  hasPremiumBookMarker,
  premiumAudienceSchema,
  premiumBookAssetSchema,
  premiumBookType,
  readPremiumBookMarker,
} from '@/lib/premium-children-book/contract';
import { loadPublishedPremiumBook } from '@/lib/premium-children-book/storage';
import { PrintError } from './contracts';

export const PREMIUM_SQUARE_PACKAGE = '0850X0850.FC.PRE.CW.080CW444.MXX';
export const LEGACY_PREMIUM_SQUARE_PACKAGE = '0850X0850FCPRECW080CW444MXX';
const squarePackageSchema = z.enum([PREMIUM_SQUARE_PACKAGE, LEGACY_PREMIUM_SQUARE_PACKAGE]);
const profile = 'premium_square_casewrap';

const editionSchema = z
  .object({
    profile: z.literal(profile),
    podPackageId: squarePackageSchema.optional(),
    pageCount: z.literal([32, 33]),
    luluEnvironment: z.enum(['sandbox', 'production']).optional(),
    premiumBook: z.object({
      version: z.literal(1),
      type: z.literal(premiumBookType),
      state: z.literal('published'),
      revision: z.uuid(),
      manifest: premiumBookAssetSchema,
      ownerId: z.uuid().optional(),
      audience: premiumAudienceSchema.optional(),
    }),
  })
  .refine((edition) => Boolean(edition.podPackageId) === Boolean(edition.luluEnvironment));

export type PremiumSquareEdition = z.infer<typeof editionSchema>;

type SquareSupplier = Required<Pick<PremiumSquareEdition, 'luluEnvironment' | 'podPackageId'>>;

export function configuredSquareSupplier(): SquareSupplier | null {
  const mode = process.env.LULU_PRINT_ENVIRONMENT;
  if (mode !== 'sandbox' && mode !== 'production') return null;
  const podPackageId = squarePackageSchema.safeParse(
    process.env.LULU_PREMIUM_SQUARE_POD_PACKAGE_ID?.trim(),
  );
  if (!podPackageId.success || !luluConfigured()) return null;
  // Normalize the legacy nodot SKU to the current dotted Lulu pod_package_id.
  return { luluEnvironment: mode, podPackageId: PREMIUM_SQUARE_PACKAGE };
}

function matchesApproval(value: string | undefined, mode: string) {
  const [approvedMode, reference, extra] = (value ?? '').trim().split(':');
  return approvedMode === mode && extra === undefined && /^[\w./-]+$/.test(reference ?? '');
}

export function squarePrintApproved(mode: 'manual' | SquareSupplier['luluEnvironment']) {
  return matchesApproval(process.env.PREMIUM_SQUARE_PRINT_APPROVAL, mode);
}

export function approvedSquareSupplier(): SquareSupplier | null {
  const supplier = configuredSquareSupplier();
  return supplier && squarePrintApproved(supplier.luluEnvironment) ? supplier : null;
}

function configuredCustomerCountries() {
  const list = process.env.LULU_PREMIUM_SQUARE_CUSTOMER_COUNTRIES?.trim();
  const countries = list ? list.split(',').map((country) => country.trim()) : [];
  return countries.every((country) => /^[A-Z]{2}$/.test(country)) ? [...new Set(countries)] : [];
}

export function getSquareLuluCustomerCountries(): string[] {
  return approvedSquareSupplier() ? configuredCustomerCountries() : [];
}

export function squareLuluAuthorization(country: string, staffProof: boolean) {
  const supplier = configuredSquareSupplier();
  if (!supplier) {
    return {
      error: new PrintError(
        'square_supplier_unavailable',
        'Square print setup is incomplete for Lulu.',
        503,
      ),
    };
  }
  if (staffProof) {
    return matchesApproval(
      process.env.LULU_PREMIUM_SQUARE_STAFF_PROOF_APPROVAL,
      supplier.luluEnvironment,
    )
      ? { supplier }
      : {
          error: new PrintError(
            'square_lulu_staff_proof_unapproved',
            'The Lulu staff proof pilot is closed for this environment.',
          ),
        };
  }
  if (!squarePrintApproved(supplier.luluEnvironment)) {
    return {
      error: new PrintError(
        'square_lulu_customer_unapproved',
        'The square hardcover needs a physical Lulu approval for this environment.',
      ),
    };
  }
  if (!configuredCustomerCountries().includes(country)) {
    return {
      error: new PrintError(
        'square_lulu_destination_unapproved',
        'This destination is outside the Lulu square hardcover pilot.',
      ),
    };
  }
  return { supplier };
}

export function readSquareEdition(options: unknown): PremiumSquareEdition | null {
  if (!options || typeof options !== 'object' || !('premiumEdition' in options)) return null;
  const edition = editionSchema.safeParse(options.premiumEdition);
  if (!edition.success)
    throw new PrintError(
      'invalid_square_edition',
      'The square order has an invalid frozen edition.',
    );
  return edition.data;
}

export async function getPublishedSquareEdition(
  story: { storyId: string; authorId: string; features: unknown },
  supplier?: SquareSupplier | null,
) {
  try {
    if (!hasPremiumBookMarker(story.features)) return null;
    const premiumBook = readPremiumBookMarker(story.features);
    if (!premiumBook || premiumBook.state !== 'published') return null;
    const manifest = await loadPublishedPremiumBook(story.storyId, story.authorId, story.features);
    if (!manifest) return null;
    const edition = editionSchema.parse({
      profile,
      ...supplier,
      pageCount: manifest.format.pageCount,
      premiumBook,
    });
    return { edition, manifest };
  } catch {
    throw new PrintError(
      'square_edition_unavailable',
      'The square book edition could not be verified.',
    );
  }
}

export function requireSquareSupplier(edition: PremiumSquareEdition) {
  if (
    !edition.podPackageId ||
    !edition.luluEnvironment ||
    process.env.LULU_PRINT_ENVIRONMENT !== edition.luluEnvironment
  )
    throw new PrintError(
      'square_supplier_changed',
      'Restore the Lulu environment pinned to this order.',
    );
  return edition.podPackageId;
}

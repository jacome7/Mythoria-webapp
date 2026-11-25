import { z } from 'zod';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { premiumOpeningColors, premiumOpeningMotifs } from './opening-design';

export const premiumBookType = 'premium_children' as const;
export const bookTypeSchema = z.enum(['standard', premiumBookType]);
export type BookType = z.infer<typeof bookTypeSchema>;
export const premiumAudienceSchema = z.enum(['children_0-2', 'children_3-6']);
export const isPremiumBookAudience = (audience: unknown) =>
  premiumAudienceSchema.safeParse(audience).success;

export const premiumBookAssetSchema = z.object({
  key: z.string().min(1).max(512),
  generation: z.string().regex(/^[1-9]\d*$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().positive(),
});
export type PremiumBookAsset = z.infer<typeof premiumBookAssetSchema>;
export const maxPremiumAudiobookBytes = 16 * 1024 * 1024;

const markerBase = { version: z.literal(1), type: z.literal(premiumBookType) };
export const draftPremiumBookMarker = {
  version: 1,
  type: premiumBookType,
  state: 'draft',
} as const;
const bookMarkerSchema = z.discriminatedUnion('state', [
  z.object({ ...markerBase, state: z.literal('draft') }),
  z.object({
    ...markerBase,
    state: z.literal('queued'),
    revision: z.string().uuid(),
    ownerId: z.string().uuid(),
    audience: premiumAudienceSchema,
  }),
  z.object({
    ...markerBase,
    state: z.literal('published'),
    revision: z.string().uuid(),
    manifest: premiumBookAssetSchema,
    ownerId: z.string().uuid().optional(),
    audience: premiumAudienceSchema.optional(),
  }),
]);
export type PremiumBookMarker = z.infer<typeof bookMarkerSchema>;

export class PremiumBookContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PremiumBookContractError';
  }
}

export function storyFeatureRecord(features: unknown): Record<string, unknown> {
  return features && typeof features === 'object' && !Array.isArray(features)
    ? (features as Record<string, unknown>)
    : {};
}

export function hasPremiumBookMarker(features: unknown): boolean {
  return Object.hasOwn(storyFeatureRecord(features), 'premiumBook');
}

export function readPremiumBookMarker(features: unknown): PremiumBookMarker | null {
  if (!hasPremiumBookMarker(features)) return null;
  const result = bookMarkerSchema.safeParse(storyFeatureRecord(features).premiumBook);
  if (!result.success) throw new PremiumBookContractError('Invalid premium book marker');
  return result.data;
}

const unit = z.number().min(0).max(1);
const publicationField = z.object({ label: z.string().min(1), value: z.string().min(1) });
const publicationDetails = z.object({
  title: publicationField,
  details: z.array(publicationField).length(4),
  copyright: z.string().min(1),
  rights: z.string().min(1),
  promotion: z.string().min(1),
});
const pageSchema = z.object({
  number: z.number().int().min(1).max(33),
  kind: z.enum([
    'title',
    'copyright',
    'dedication',
    'synopsis',
    'opener',
    'spread',
    'ending',
    'invitation',
  ]),
  text: z.string().max(20_000),
  spreadId: z.string().min(1).optional(),
  artwork: premiumBookAssetSchema.optional(),
  reading: premiumBookAssetSchema.optional(),
  textBox: z.object({ x: unit, y: unit, width: unit, height: unit }).optional(),
  link: z.object({ label: z.string().trim().min(1).max(160), href: z.string().url() }).optional(),
});

export const premiumBookManifestSchema = z.object({
  ...markerBase,
  editionLayout: z.literal('embedded-lettering-v2').optional(),
  specification: publicationDetails.optional(),
  storyId: z.string().uuid(),
  ownerId: z.string().uuid(),
  revision: z.string().uuid(),
  previousRevision: z.string().uuid().optional(),
  pages: z.array(pageSchema).min(32).max(33),
  covers: z.object({ front: premiumBookAssetSchema, back: premiumBookAssetSchema }),
  spreads: z
    .array(
      z.object({
        id: z.string().min(1),
        leftPage: z.number().int(),
        rightPage: z.number().int(),
        master: premiumBookAssetSchema,
        nativeWidth: z.number().int().positive(),
        nativeHeight: z.number().int().positive(),
        textLayout: z.enum(['both_pages', 'right_only']).optional(),
        leftDescription: z.string().trim().min(1).max(250).optional(),
      }),
    )
    .length(13),
  opening: z.object({
    title: z.string(),
    author: z.string(),
    locale: z.enum(SUPPORTED_LOCALES),
    dedication: z.string(),
    synopsis: z.string(),
    createdAt: z.string(),
  }),
  openingDesign: z
    .object({
      background: z.enum(premiumOpeningColors),
      motif: z.enum(premiumOpeningMotifs),
    })
    .optional(),
  motifArtwork: premiumBookAssetSchema.optional(),
  format: z.object({
    trimPoints: z.literal(612),
    bleedPoints: z.literal(9),
    pageCount: z.union([z.literal(32), z.literal(33)]),
  }),
});
export type PremiumBookManifest = z.infer<typeof premiumBookManifestSchema>;

export function premiumInvitationPath(locale: string) {
  return `/${locale}/tell-your-story`;
}

export function premiumRevisionPrefix(storyId: string, revision: string): string {
  return `${storyId}/premium/revisions/${revision}/`;
}

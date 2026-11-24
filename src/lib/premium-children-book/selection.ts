import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authors, characters, stories, storyCharacters } from '@/db/schema';
import {
  draftPremiumBookMarker,
  hasPremiumBookMarker,
  isPremiumBookAudience,
  premiumBookType,
  readPremiumBookMarker,
  storyFeatureRecord,
  type BookType,
} from './contract';

export type PremiumBookSelectionErrorCode =
  | 'book_type_not_available'
  | 'book_type_changed'
  | 'book_type_locked'
  | 'incompatible_book_features';

export class PremiumBookSelectionError extends Error {
  constructor(readonly code: PremiumBookSelectionErrorCode) {
    super(code);
    this.name = 'PremiumBookSelectionError';
  }
}

export function premiumGenerationEnabled() {
  return (
    process.env.PREMIUM_BOOK_GENERATION_ENABLED === 'true' &&
    Boolean(process.env.PREMIUM_BOOK_BUCKET?.trim())
  );
}

export function isBookFormatEditable(status: string | null | undefined) {
  return status === 'draft' || status === 'temporary';
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function assertEditableStoryCharacters(tx: Transaction, storyId: string) {
  const [story] = await tx
    .select({ features: stories.features, status: stories.status })
    .from(stories)
    .where(eq(stories.storyId, storyId))
    .for('update');
  if (
    story &&
    hasPremiumBookMarker(story.features) &&
    (readPremiumBookMarker(story.features)?.state !== 'draft' ||
      !isBookFormatEditable(story.status))
  ) {
    throw new PremiumBookSelectionError('book_type_locked');
  }
}

export async function assertReusableCharacterReadyForUpdate(tx: Transaction, characterId: string) {
  await tx
    .select({ characterId: characters.characterId })
    .from(characters)
    .where(eq(characters.characterId, characterId))
    .for('update');
  const [pending] = await tx
    .select({ storyId: stories.storyId })
    .from(storyCharacters)
    .innerJoin(stories, eq(stories.storyId, storyCharacters.storyId))
    .where(
      and(
        eq(storyCharacters.characterId, characterId),
        eq(stories.status, 'writing'),
        sql`${stories.features}->'premiumBook'->>'state' = 'queued'`,
        sql`coalesce(${stories.storyGenerationStatus}::text, '') not in ('failed', 'cancelled')`,
      ),
    )
    .limit(1);
  if (pending) throw new PremiumBookSelectionError('book_type_locked');
}

export async function savePremiumBookSelection(
  storyId: string,
  authorId: string,
  bookType: BookType,
  targetAudience: (typeof stories.$inferSelect)['targetAudience'],
) {
  return db.transaction(async (tx) => {
    // Keep lock order aligned with generation acceptance.
    const [story] = await tx
      .select()
      .from(stories)
      .where(and(eq(stories.storyId, storyId), eq(stories.authorId, authorId)))
      .for('update');
    if (!story) return null;
    const marker = readPremiumBookMarker(story.features);
    if (!isBookFormatEditable(story.status) || (marker && marker.state !== 'draft')) {
      throw new PremiumBookSelectionError('book_type_locked');
    }

    const { premiumBook: _previousSelection, ...features } = storyFeatureRecord(story.features);
    if (bookType === premiumBookType) {
      const [author] = await tx
        .select({ experimental: authors.experimentalFeaturesEnabled })
        .from(authors)
        .where(eq(authors.authorId, authorId))
        .for('share');
      if (!premiumGenerationEnabled() || !author?.experimental) {
        throw new PremiumBookSelectionError('book_type_not_available');
      }
      // The route validates the audience; retain the check for direct service callers.
      if (!isPremiumBookAudience(targetAudience)) {
        throw new PremiumBookSelectionError('book_type_not_available');
      }
      features.premiumBook = draftPremiumBookMarker;
    }

    const [updated] = await tx
      .update(stories)
      .set({ features, targetAudience, updatedAt: new Date() })
      .where(eq(stories.storyId, storyId))
      .returning();
    return updated;
  });
}

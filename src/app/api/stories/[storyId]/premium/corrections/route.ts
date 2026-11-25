import { NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { db } from '@/db';
import { aiEdits, authorCreditBalances, creditLedger, stories } from '@/db/schema';
import { aiEditService, storyService } from '@/db/services';
import {
  readPremiumBookMarker,
  premiumBookAssetSchema,
  premiumRevisionPrefix,
  storyFeatureRecord,
} from '@/lib/premium-children-book/contract';
import { sgwFetch } from '@/lib/sgw-client';

export const maxDuration = 600;

const editSchema = z
  .object({
    maximumCredits: z.number().int().nonnegative(),
    correctionId: z.uuid(),
    expectedRevision: z.uuid(),
    spreadId: z.string().regex(/^(?:spread-(?:[1-9]|1[0-3])|front|back|opener|ending)$/),
    targetSide: z.enum(['left', 'right']).optional(),
    artworkInstructions: z.string().trim().min(1).max(1500),
  })
  .strict()
  .refine((input) => input.expectedRevision !== input.correctionId);

export async function POST(request: Request, context: { params: Promise<{ storyId: string }> }) {
  const author = await getCurrentAuthor();
  if (!author) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { storyId } = await context.params;
  const input = editSchema.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(storyId).success || !input.success)
    return NextResponse.json({ error: 'invalid_edit' }, { status: 400 });
  const story = await storyService.getStoryById(storyId);
  if (!story || story.authorId !== author.authorId || story.status !== 'published')
    return NextResponse.json({ error: 'Story unavailable' }, { status: 404 });
  const marker = readPremiumBookMarker(story.features);
  const { maximumCredits, ...edit } = input.data;
  const conflict = () => NextResponse.json({ error: 'edition_changed' }, { status: 409 });
  if (
    marker?.state !== 'published' ||
    ![edit.expectedRevision, edit.correctionId].includes(marker.revision)
  )
    return conflict();
  const noCredit = () => NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
  if (marker.revision !== edit.correctionId) {
    const permission = await aiEditService.checkEditPermission(author.authorId, 'imageEdit');
    if (!permission.canEdit || permission.requiredCredits > maximumCredits) return noCredit();
  }
  const result = await sgwFetch(`/internal/premium/stories/${storyId}/corrections/prepare`, {
    method: 'POST',
    body: JSON.stringify(edit),
    cache: 'no-store',
  });
  if (!result.ok) return NextResponse.json({ error: 'edit_failed' }, { status: result.status });
  const prepared = z
    .object({ revision: z.literal(edit.correctionId), manifest: premiumBookAssetSchema })
    .parse(await result.json());
  if (prepared.manifest.key !== premiumRevisionPrefix(storyId, edit.correctionId) + 'manifest.json')
    return conflict();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${author.authorId}, 0))`);
    const [record] = await tx
      .select({ features: stories.features })
      .from(stories)
      .where(
        and(
          eq(stories.storyId, storyId),
          eq(stories.authorId, author.authorId),
          eq(stories.status, 'published'),
        ),
      )
      .for('update');
    const current = readPremiumBookMarker(record?.features);
    if (current?.state !== 'published') return conflict();
    if (
      current.revision === edit.correctionId &&
      current.manifest.sha256 === prepared.manifest.sha256
    )
      return NextResponse.json({ revision: current.revision });
    if (current.revision !== edit.expectedRevision) return conflict();
    const cost = await aiEditService.calculateRequiredCredits(author.authorId, 'imageEdit', tx);
    if (cost > maximumCredits) return noCredit();
    if (cost > 0) {
      const debited = await tx
        .update(authorCreditBalances)
        .set({
          totalCredits: sql`${authorCreditBalances.totalCredits} - ${cost}`,
          lastUpdated: new Date(),
        })
        .where(
          and(
            eq(authorCreditBalances.authorId, author.authorId),
            gte(authorCreditBalances.totalCredits, cost),
          ),
        )
        .returning({ id: authorCreditBalances.authorId });
      if (!debited.length) return noCredit();
      await tx.insert(creditLedger).values({
        authorId: author.authorId,
        storyId,
        amount: -cost,
        creditEventType: 'imageEdit',
        idempotencyKey: `premium-edit:${storyId}:${edit.correctionId}`,
      });
    }
    await tx.insert(aiEdits).values({
      authorId: author.authorId,
      storyId,
      action: 'imageEdit',
      metadata: {
        spreadId: edit.spreadId,
        targetSide: edit.targetSide,
        revision: edit.correctionId,
      },
    });
    await tx
      .update(stories)
      .set({
        features: {
          ...storyFeatureRecord(record.features),
          premiumBook: { ...current, ...prepared },
        },
        updatedAt: new Date(),
      })
      .where(eq(stories.storyId, storyId));
    return NextResponse.json({ revision: prepared.revision });
  });
}

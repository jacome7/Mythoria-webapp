import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { analyticsAttributions, analyticsOutbox } from '@/db/schema';
import { getCurrentAuthor } from '@/lib/auth';
import { revokeGrowthMeasurement } from '@/lib/growth/measurement-server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const receipt = z.string().uuid().safeParse(request.cookies.get('mythoria_attribution')?.value);
  const author = await getCurrentAuthor().catch(() => null);
  const scope = or(
    receipt.success ? eq(analyticsAttributions.attributionId, receipt.data) : undefined,
    author ? eq(analyticsAttributions.authorId, author.authorId) : undefined,
  );
  const now = new Date();

  if (scope) {
    const revoked = await db.transaction(async (tx) => {
      const revoked = await tx
        .update(analyticsAttributions)
        .set({
          revokedAt: now,
          expiresAt: now,
          oppref: null,
          opprefCapturedAt: null,
          obref: null,
          gclid: null,
          gbraid: null,
          wbraid: null,
          firstClickIdentifier: null,
          firstClickIdentifierKind: null,
          storyShareItemId: null,
          storyShareMethod: null,
          storyShareScope: null,
          storyShareTouchedAt: null,
          storyShareExpiresAt: null,
        })
        .where(and(scope, isNull(analyticsAttributions.revokedAt)))
        .returning({
          attributionId: analyticsAttributions.attributionId,
          clientId: analyticsAttributions.clientId,
        });

      const outboxScope = or(
        ...revoked.flatMap(({ attributionId, clientId }) => [
          eq(analyticsOutbox.attributionId, attributionId),
          and(isNull(analyticsOutbox.attributionId), eq(analyticsOutbox.clientId, clientId)),
        ]),
        author ? eq(analyticsOutbox.authorId, author.authorId) : undefined,
      );
      if (outboxScope) {
        await tx
          .update(analyticsOutbox)
          .set({
            skippedAt: now,
            suppressionReason: 'consent_revoked',
            claimToken: null,
            claimedAt: null,
            clientId: null,
            userId: null,
            sessionId: null,
            pageLocation: null,
            pageReferrer: null,
            consent: null,
            params: {},
            lastError: null,
          })
          .where(
            and(
              outboxScope,
              isNull(analyticsOutbox.deliveredAt),
              isNull(analyticsOutbox.skippedAt),
            ),
          );
      }
      if (revoked.length) {
        await tx
          .update(analyticsAttributions)
          .set({
            clientId: 'revoked',
            sessionId: null,
            engagementTimeMsec: null,
            latestPath: null,
            latestReferrerPath: null,
            landingSlug: null,
            firstLandingPath: null,
          })
          .where(
            inArray(
              analyticsAttributions.attributionId,
              revoked.map((row) => row.attributionId),
            ),
          );
      }
      return revoked;
    });

    const receipts = new Set(revoked.map(({ attributionId }) => attributionId));
    if (receipt.success) receipts.add(receipt.data);
    for (const attributionId of receipts) {
      await revokeGrowthMeasurement(attributionId).catch(() => {
        console.warn('[Attribution] Deferred growth measurement cleanup');
      });
    }
  }

  const response = NextResponse.json({ revoked: true });
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
  };
  response.cookies.set('mythoria_attribution', '', { ...base, path: '/' });
  response.cookies.set('mythoria_reader_link', '', {
    ...base,
    path: '/api/analytics/qualified-share',
  });
  return response;
}

import { randomInt } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { analyticsAttributions } from '@/db/schema/analytics';
import { productExperimentAssignments as assignments } from '@/db/schema/product-experiments';
import { readAnalyticsConsentCookie } from '@/lib/analytics/consent-server';
import { CONSENT_COOKIE_NAME } from '@/lib/consent';
import {
  activeExperiment,
  canObserveReader,
  experimentOrder,
  FOLLOWUP_MS,
  productExperimentRelease,
} from '@/lib/product-experiments/release';

const payload = z.union([
  z.object({ action: z.literal('assign'), experiment: z.enum(experimentOrder) }).strict(),
  z.object({ action: z.enum(['reader_started', 'reader_ended']) }).strict(),
]);

const answer = (arm: 'control' | 'treatment' | null = null) =>
  NextResponse.json({ arm }, { headers: { 'Cache-Control': 'private, no-store' } });

export async function POST(request: NextRequest) {
  const now = Date.now();
  const active = activeExperiment(productExperimentRelease, now);
  if (!active && !canObserveReader(productExperimentRelease, now)) return answer();
  if (
    request.nextUrl.hostname !== 'mythoria.pt' ||
    request.headers.get('origin') !== 'https://mythoria.pt' ||
    !readAnalyticsConsentCookie(request.cookies.get(CONSENT_COOKIE_NAME)?.value)
  )
    return answer();
  const token = z.uuid().safeParse(request.cookies.get('mythoria_attribution')?.value);
  if (!token.success) return answer();
  const parsed = payload.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return answer();
  const event = parsed.data;
  if (event.action === 'assign' && event.experiment !== active) return answer();
  if (event.action !== 'assign' && !canObserveReader(productExperimentRelease, now))
    return answer();
  try {
    const arm = await db.transaction(async (tx) => {
      // Hold the receipt through the write so withdrawal and assignment serialize.
      const [receipt] = await tx
        .select({ id: analyticsAttributions.attributionId })
        .from(analyticsAttributions)
        .where(
          and(
            eq(analyticsAttributions.attributionId, token.data),
            isNull(analyticsAttributions.revokedAt),
            sql`${analyticsAttributions.consent}->>'analyticsStorage' = 'granted'`,
            gt(analyticsAttributions.expiresAt, new Date(now)),
          ),
        )
        .for('share')
        .limit(1);
      if (!receipt) return null;
      if (event.action === 'assign') {
        const condition = and(
          eq(assignments.experimentId, event.experiment),
          eq(assignments.attributionId, receipt.id),
        );
        const [inserted] = await tx
          .insert(assignments)
          .values({
            attributionId: receipt.id,
            experimentId: event.experiment,
            arm: randomInt(2) === 0 ? 'control' : 'treatment',
          })
          .onConflictDoNothing()
          .returning({ arm: assignments.arm });
        if (inserted) return inserted.arm;
        const [existing] = await tx
          .select({ arm: assignments.arm })
          .from(assignments)
          .where(condition);
        return existing?.arm ?? null;
      }
      const observed =
        event.action === 'reader_ended'
          ? {
              readerStartedAt: sql`coalesce(${assignments.readerStartedAt}, now())`,
              readerEndedAt: sql`coalesce(${assignments.readerEndedAt}, now())`,
            }
          : { readerStartedAt: sql`coalesce(${assignments.readerStartedAt}, now())` };
      await tx
        .update(assignments)
        .set(observed)
        .where(
          and(
            eq(assignments.attributionId, receipt.id),
            gt(assignments.assignedAt, new Date(now - FOLLOWUP_MS)),
          ),
        );
      return null;
    });
    return answer(arm);
  } catch {
    // The core product always remains available when measurement fails.
    return NextResponse.json(
      { arm: null },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
}

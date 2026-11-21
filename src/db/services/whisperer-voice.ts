import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { biographerSessions } from '@/db/schema/biographer';
import type { db } from '@/db';
import { authorVoiceAccounts } from '@/db/schema/whisperer-voice';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// All sessions for this author reserve and settle against the same locked row.
export async function lockVoiceAccount(tx: Transaction, authorId: string) {
  await tx.insert(authorVoiceAccounts).values({ authorId }).onConflictDoNothing();
  const [account] = await tx
    .select()
    .from(authorVoiceAccounts)
    .where(eq(authorVoiceAccounts.authorId, authorId))
    .for('update');
  return account;
}

// Caller holds the project lock. Expired leases have already consumed their reservation.
export async function settleResetVoiceSessions(
  tx: Transaction,
  authorId: string,
  projectId: string,
) {
  const now = new Date();
  const sessions = await tx
    .select()
    .from(biographerSessions)
    .where(
      and(
        eq(biographerSessions.projectId, projectId),
        isNotNull(biographerSessions.consumedAt),
        isNull(biographerSessions.endedAt),
      ),
    );
  if (!sessions.length) return;
  const account = await lockVoiceAccount(tx, authorId);
  const unused = sessions.reduce((seconds, session) => {
    if (!session.accountedAt) return seconds;
    const elapsed = Math.max(0, Math.ceil((now.getTime() - session.accountedAt.getTime()) / 1000));
    return seconds + Math.max(0, session.reservedSeconds - elapsed);
  }, 0);
  await tx
    .update(authorVoiceAccounts)
    .set({ liveSeconds: Math.max(0, account.liveSeconds - unused) })
    .where(eq(authorVoiceAccounts.authorId, authorId));
  await tx
    .update(biographerSessions)
    .set({ endedAt: now, reservedSeconds: 0, ticketExpiresAt: now })
    .where(and(eq(biographerSessions.projectId, projectId), isNull(biographerSessions.endedAt)));
}

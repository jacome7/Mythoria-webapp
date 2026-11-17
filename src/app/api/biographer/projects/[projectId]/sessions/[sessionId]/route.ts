import { handle, owner, id } from '@/lib/biographer/http';
import { detail, leaseSession } from '@/db/services/biographer';
import { db } from '@/db';
import { biographerSessions } from '@/db/schema/biographer';
import { and, eq } from 'drizzle-orm';
export const PATCH = (
  _: Request,
  c: { params: Promise<{ projectId: string; sessionId: string }> },
) =>
  handle(async () => {
    const a = await owner();
    const p = await c.params;
    await detail(a.authorId, id(p.projectId));
    const [s] = await db
      .select()
      .from(biographerSessions)
      .where(
        and(
          eq(biographerSessions.id, id(p.sessionId)),
          eq(biographerSessions.projectId, p.projectId),
        ),
      );
    if (!s) return { allowed: false };
    return leaseSession(s.id, s.leaseId, true);
  });

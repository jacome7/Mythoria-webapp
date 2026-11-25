import { body, handle, owner, id } from '@/lib/biographer/http';
import {
  cancelWhispererSession,
  detail,
  leaseSession,
  whispererSessionStatus,
} from '@/db/services/biographer';
import { db } from '@/db';
import { biographerSessions } from '@/db/schema/biographer';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

export const GET = (
  _: Request,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) =>
  handle(async () => {
    const author = await owner();
    const { projectId, sessionId } = await context.params;
    return whispererSessionStatus(author.authorId, id(projectId), id(sessionId));
  });

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

export const DELETE = (
  request: Request,
  context: { params: Promise<{ projectId: string; sessionId: string }> },
) =>
  handle(async () => {
    const author = await owner();
    const { projectId, sessionId } = await context.params;
    const { turnId } = z
      .object({ turnId: z.uuid().optional() })
      .strict()
      .parse(await body(request));
    return cancelWhispererSession(author.authorId, id(projectId), id(sessionId), turnId);
  });

import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  biographerProjects,
  biographerAdminActions,
  biographerParticipants,
} from '@/db/schema/biographer';
import { BiographerError } from '@/db/services/biographer';
const oidc = new OAuth2Client();
export async function verifyAdmin(request: Request) {
  const audience = process.env.BIOGRAPHER_INTERNAL_AUDIENCE;
  const accounts = (process.env.BIOGRAPHER_ADMIN_SERVICE_ACCOUNTS || '').split(',').filter(Boolean);
  const bearer = request.headers.get('authorization');
  if (!audience || !accounts.length || !bearer?.startsWith('Bearer '))
    throw new BiographerError('Unauthorized', 401);
  let email: string | undefined;
  try {
    const ticket = await oidc.verifyIdToken({ idToken: bearer.slice(7), audience });
    const p = ticket.getPayload();
    if (!p?.email_verified) throw new Error();
    email = p.email;
  } catch {
    throw new BiographerError('Unauthorized', 401);
  }
  if (!email || !accounts.includes(email)) throw new BiographerError('Forbidden', 403);
  return email;
}
const common = {
  projectId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
  requestId: z.uuid(),
};
export const commandSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('listProjects'),
    input: z
      .object({ limit: z.number().int().min(1).max(100).default(100) })
      .default({ limit: 100 }),
    actor: z.object({ email: z.email() }),
  }),
  z.object({
    operation: z.literal('getProject'),
    input: z.object({ projectId: z.uuid() }),
    actor: z.object({ email: z.email() }),
  }),
  z.object({
    operation: z.literal('extendAllowance'),
    input: z.object({ ...common, additionalSeconds: z.number().int().min(60).max(36000) }),
    actor: z.object({ email: z.email() }),
  }),
  z.object({
    operation: z.literal('setLiveEnabled'),
    input: z.object({ ...common, enabled: z.boolean() }),
    actor: z.object({ email: z.email() }),
  }),
]);
function dto(p: typeof biographerProjects.$inferSelect) {
  return {
    projectId: p.id,
    title: p.title,
    locale: p.locale,
    status: p.status,
    liveSecondsUsed: p.liveSeconds,
    liveSecondsLimit: p.allowanceSeconds,
    liveEnabled: p.liveEnabled,
    updatedAt: p.updatedAt,
  };
}
export async function adminCommand(value: unknown, caller: string) {
  const c = commandSchema.parse(value);
  if (c.operation === 'listProjects')
    return (
      await db
        .select()
        .from(biographerProjects)
        .orderBy(desc(biographerProjects.updatedAt))
        .limit(c.input.limit)
    ).map(dto);
  if (c.operation === 'getProject') {
    const [p] = await db
      .select()
      .from(biographerProjects)
      .where(eq(biographerProjects.id, c.input.projectId));
    if (!p) throw new BiographerError('Project not found', 404);
    const people = await db
      .select({ status: biographerParticipants.status })
      .from(biographerParticipants)
      .where(eq(biographerParticipants.projectId, p.id));
    return {
      ...dto(p),
      participantCount: people.length,
      startedCount: people.filter((v) => ['started', 'finished'].includes(v.status)).length,
      finishedCount: people.filter((v) => v.status === 'finished').length,
    };
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${c.input.projectId}))`);
    const [previous] = await tx
      .select()
      .from(biographerAdminActions)
      .where(eq(biographerAdminActions.requestId, c.input.requestId));
    if (
      previous &&
      (previous.projectId !== c.input.projectId ||
        previous.operation !== c.operation ||
        previous.actor !== c.actor.email ||
        previous.reason !== c.input.reason ||
        previous.payload !== JSON.stringify(c.input))
    )
      throw new BiographerError('Command conflict', 409);
    const audit = await tx
      .insert(biographerAdminActions)
      .values({
        requestId: c.input.requestId,
        projectId: c.input.projectId,
        actor: c.actor.email,
        caller,
        operation: c.operation,
        reason: c.input.reason,
        payload: JSON.stringify(c.input),
      })
      .onConflictDoNothing()
      .returning();
    if (audit.length) {
      await tx
        .update(biographerProjects)
        .set(
          c.operation === 'extendAllowance'
            ? {
                allowanceSeconds: sql`${biographerProjects.allowanceSeconds}+${c.input.additionalSeconds}`,
                updatedAt: new Date(),
              }
            : { liveEnabled: c.input.enabled, updatedAt: new Date() },
        )
        .where(eq(biographerProjects.id, c.input.projectId));
    }
    const [p] = await tx
      .select()
      .from(biographerProjects)
      .where(eq(biographerProjects.id, c.input.projectId));
    if (!p) throw new BiographerError('Project not found', 404);
    const people = await db
      .select({ status: biographerParticipants.status })
      .from(biographerParticipants)
      .where(eq(biographerParticipants.projectId, p.id));
    return {
      ...dto(p),
      participantCount: people.length,
      startedCount: people.filter((v) => ['started', 'finished'].includes(v.status)).length,
      finishedCount: people.filter((v) => v.status === 'finished').length,
    };
  });
}

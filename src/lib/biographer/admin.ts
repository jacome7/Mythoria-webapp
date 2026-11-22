import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { biographerProjects, biographerParticipants } from '@/db/schema/biographer';
import { BiographerError } from '@/db/services/biographer';
import { authorVoiceAccounts, authorVoiceActions } from '@/db/schema/whisperer-voice';
import { lockVoiceAccount } from '@/db/services/whisperer-voice';
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
function dto(
  p: typeof biographerProjects.$inferSelect,
  account: typeof authorVoiceAccounts.$inferSelect | null,
) {
  return {
    projectId: p.id,
    authorId: p.authorId,
    title: p.title,
    locale: p.locale,
    status: p.status,
    liveSecondsUsed: account?.liveSeconds ?? 0,
    liveSecondsLimit: account?.allowanceSeconds ?? 10800,
    liveEnabled: account?.liveEnabled ?? true,
    updatedAt: p.updatedAt,
  };
}
export async function adminCommand(value: unknown, caller: string) {
  const c = commandSchema.parse(value);
  const query = db
    .select({ project: biographerProjects, account: authorVoiceAccounts })
    .from(biographerProjects)
    .leftJoin(authorVoiceAccounts, eq(authorVoiceAccounts.authorId, biographerProjects.authorId));
  if (c.operation === 'listProjects') {
    const rows = await query.orderBy(desc(biographerProjects.updatedAt)).limit(c.input.limit);
    return rows.map(({ project, account }) => dto(project, account));
  }
  if (c.operation === 'getProject') {
    const [row] = await query.where(eq(biographerProjects.id, c.input.projectId));
    if (!row) throw new BiographerError('Project not found', 404);
    const people = await db
      .select({ status: biographerParticipants.status })
      .from(biographerParticipants)
      .where(eq(biographerParticipants.projectId, row.project.id));
    return {
      ...dto(row.project, row.account),
      participantCount: people.length,
      startedCount: people.filter((p) => ['started', 'finished'].includes(p.status)).length,
      finishedCount: people.filter((p) => p.status === 'finished').length,
    };
  }
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${c.input.requestId}))`);
    const [previous] = await tx
      .select()
      .from(authorVoiceActions)
      .where(eq(authorVoiceActions.requestId, c.input.requestId));
    if (
      previous &&
      (previous.projectId !== c.input.projectId ||
        previous.operation !== c.operation ||
        previous.actor !== c.actor.email ||
        previous.caller !== caller ||
        previous.payload !== JSON.stringify(c.input))
    )
      throw new BiographerError('Command conflict', 409);
    if (previous) {
      const [row] = await tx
        .select({ project: biographerProjects, account: authorVoiceAccounts })
        .from(biographerProjects)
        .leftJoin(
          authorVoiceAccounts,
          eq(authorVoiceAccounts.authorId, biographerProjects.authorId),
        )
        .where(eq(biographerProjects.id, c.input.projectId));
      return row ? dto(row.project, row.account) : { applied: true, authorId: previous.authorId };
    }
    const [project] = await tx
      .select()
      .from(biographerProjects)
      .where(eq(biographerProjects.id, c.input.projectId));
    if (!project) throw new BiographerError('Project not found', 404);
    await lockVoiceAccount(tx, project.authorId);
    const [updated] = await tx
      .update(authorVoiceAccounts)
      .set(
        c.operation === 'extendAllowance'
          ? {
              allowanceSeconds: sql`${authorVoiceAccounts.allowanceSeconds} + ${c.input.additionalSeconds}`,
            }
          : { liveEnabled: c.input.enabled },
      )
      .where(eq(authorVoiceAccounts.authorId, project.authorId))
      .returning();
    await tx.insert(authorVoiceActions).values({
      requestId: c.input.requestId,
      projectId: project.id,
      authorId: project.authorId,
      actor: c.actor.email,
      caller,
      operation: c.operation,
      reason: c.input.reason,
      payload: JSON.stringify(c.input),
    });
    return dto(project, updated);
  });
}

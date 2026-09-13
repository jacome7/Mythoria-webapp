/** Disposable local PostgreSQL only. No dotenv, real email, Stripe, or shared development DB. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

async function main() {
  const url = new URL(process.env.REFERRAL_TEST_DATABASE_URL || '');
  assert(['localhost', '127.0.0.1'].includes(url.hostname));
  assert(url.port === '55439' && url.pathname.startsWith('/referral_test'));
  process.env.DATABASE_URL = url.toString();
  process.env.DB_PASSWORD = url.password;
  Object.assign(process.env, {
    NODE_ENV: 'development',
    REFERRAL_PROGRAM_ENABLED: 'false',
    NEXT_PUBLIC_BASE_URL: 'https://example.test',
  });
  const { db } = await import('../src/db');
  const { eq, sql } = await import('drizzle-orm');
  const t = await import('../src/db/schema/referrals');
  const { referralService } = await import('../src/db/services/referrals');
  const { sendReferralInvitation } = await import('../src/lib/referrals/invitation');
  const { notificationClient } = await import('../src/lib/notifications/client');
  // Never allow any outbound provider call from this fixture, including inherited test rows.
  globalThis.fetch = async () => {
    throw new Error('External HTTP disabled in welcome fixture');
  };
  const sent: Parameters<typeof notificationClient.sendTemplatedEmail>[0][] = [];
  notificationClient.sendTemplatedEmail = async (args) => {
    sent.push(args);
    return { success: true };
  };
  const actor = {
    type: 'admin_ui' as const,
    id: 'welcome-fixture',
    permissions: ['referrals:manage' as const],
  };
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const input = {
    displayName: 'Welcome fixture',
    contactEmail: 'contact@example.invalid',
    memberEmails: ['partner@example.invalid', ' PARTNER@example.invalid '.trim()],
    code: `WELCOME_${suffix}`,
    commissionRateBps: 1255,
    preferredLocale: 'en-US',
  };
  const owner = await referralService.createOwner(input, actor);
  const details = await referralService.getOwner(owner.referralOwnerId);
  assert.equal(details.members.length, 1, 'normalized duplicate emails enqueue once');
  const member = details.members[0];
  const invites = () =>
    db
      .select()
      .from(t.referralOutbox)
      .where(sql`${t.referralOutbox.payload}->>'membershipId' = ${member.membershipId}`);
  assert.equal((await invites()).length, 1);
  assert.equal(sent.length, 0, 'creation only enqueues');
  await referralService.createOwner(
    { ...input, code: `MCP_${suffix}` },
    { ...actor, type: 'admin_mcp' },
  );

  // A late transaction error after invitation insertion must roll back the entire creation.
  const count = async () =>
    (await db.execute(sql`select count(*)::int as n from referral_outbox`)).rows[0].n;
  const before = await count();
  await db.execute(
    sql`create function welcome_fixture_rollback() returns trigger language plpgsql as $$ begin if NEW.actor_id = 'welcome-rollback' then raise exception 'fixture rollback'; end if; return NEW; end $$`,
  );
  await db.execute(
    sql`create trigger welcome_fixture_rollback before insert on referral_audit_events for each row execute function welcome_fixture_rollback()`,
  );
  await assert.rejects(
    referralService.createOwner(
      { ...input, code: `ROLLBACK_${suffix}` },
      { ...actor, id: 'welcome-rollback' },
    ),
  );
  assert.equal(await count(), before);
  assert.equal(
    (
      await db
        .select()
        .from(t.referralCodes)
        .where(eq(t.referralCodes.code, `ROLLBACK_${suffix}`))
    ).length,
    0,
  );
  await db.execute(sql`drop trigger welcome_fixture_rollback on referral_audit_events`);
  await db.execute(sql`drop function welcome_fixture_rollback()`);

  await referralService.setRate(
    owner.referralOwnerId,
    2000,
    new Date(Date.now() + 86400000),
    'future rate',
    actor,
  );
  const initial = (await invites())[0];
  assert.equal(await sendReferralInvitation(member.membershipId, initial.outboxId), 'completed');
  assert.equal(sent[0].recipients[0].email, 'partner@example.invalid');
  assert.equal(
    (sent[0].variables?.welcome as { rate: string }).rate,
    '12.55%',
    'future terms must not leak into current email',
  );
  assert.equal(
    (sent[0].variables?.welcome as { referralUrl: string }).referralUrl,
    `https://example.test/r/WELCOME_${suffix}`,
  );
  await referralService.inviteMember(
    owner.referralOwnerId,
    member.emailNormalized,
    'owner',
    actor,
    'resend-1',
  );
  await referralService.inviteMember(
    owner.referralOwnerId,
    member.emailNormalized,
    'owner',
    actor,
    'resend-1',
  );
  assert.equal((await invites()).length, 2, 'same resend request is idempotent');
  await referralService.inviteMember(
    owner.referralOwnerId,
    'additional@example.invalid',
    'viewer',
    actor,
    'additional-1',
  );
  assert.equal((await referralService.getOwner(owner.referralOwnerId)).members.length, 2);
  await referralService.setStatus(owner.referralOwnerId, 'suspended', 'fixture', actor);
  assert.equal(await sendReferralInvitation(member.membershipId, initial.outboxId), 'deferred');
  await referralService.setStatus(owner.referralOwnerId, 'active', 'fixture', actor);
  await referralService.updateOwner(owner.referralOwnerId, { codeActive: false }, actor);
  assert.equal(await sendReferralInvitation(member.membershipId, initial.outboxId), 'deferred');
  await referralService.updateOwner(owner.referralOwnerId, { codeActive: true }, actor);
  assert.equal(await sendReferralInvitation(member.membershipId, initial.outboxId), 'completed');
  assert.equal(sent[0].entityId, sent[1].entityId, 'retry retains notification dedupe identity');
  await referralService.setStatus(owner.referralOwnerId, 'closed', 'fixture', actor);
  assert.equal(await sendReferralInvitation(member.membershipId, initial.outboxId), 'cancelled');

  // Exercise the real outbox state machine; all pre-existing disposable fixture work is excluded.
  await db.update(t.referralOutbox).set({ status: 'completed', leaseUntil: null });
  const { drainReferralOutbox } = await import('../src/lib/referrals/jobs');
  const queuedOwner = await referralService.createOwner(
    { ...input, code: `DRAIN_${suffix}` },
    actor,
  );
  const queuedMember = (await referralService.getOwner(queuedOwner.referralOwnerId)).members[0];
  const [queued] = await db
    .select()
    .from(t.referralOutbox)
    .where(sql`${t.referralOutbox.payload}->>'membershipId' = ${queuedMember.membershipId}`);
  const state = async () =>
    (
      await db.select().from(t.referralOutbox).where(eq(t.referralOutbox.outboxId, queued.outboxId))
    )[0];
  const awaken = () =>
    db
      .update(t.referralOutbox)
      .set({ nextAttemptAt: new Date(0) })
      .where(eq(t.referralOutbox.outboxId, queued.outboxId));
  await referralService.setStatus(queuedOwner.referralOwnerId, 'suspended', 'fixture', actor);
  // Database/Windows clocks can differ slightly; explicitly make this fixture due.
  await awaken();
  await drainReferralOutbox();
  assert.equal((await state()).status, 'retry');
  assert.equal((await state()).completedAt, null);
  assert.equal((await state()).leaseUntil, null);
  await referralService.setStatus(queuedOwner.referralOwnerId, 'active', 'fixture', actor);
  await referralService.updateOwner(queuedOwner.referralOwnerId, { codeActive: false }, actor);
  await awaken();
  await drainReferralOutbox();
  assert.equal((await state()).status, 'retry');
  await referralService.updateOwner(queuedOwner.referralOwnerId, { codeActive: true }, actor);
  notificationClient.sendTemplatedEmail = async () => ({ success: false });
  await awaken();
  await drainReferralOutbox();
  assert.equal((await state()).status, 'retry');
  notificationClient.sendTemplatedEmail = async (args) => {
    sent.push(args);
    return { success: true };
  };
  await awaken();
  await drainReferralOutbox();
  assert.equal((await state()).status, 'completed');
  const delivered = sent.length;
  await drainReferralOutbox();
  assert.equal(sent.length, delivered, 'completed invitations must not be resent');
  await referralService.inviteMember(
    queuedOwner.referralOwnerId,
    queuedMember.emailNormalized,
    'owner',
    actor,
    'closed-resend',
  );
  await referralService.setStatus(queuedOwner.referralOwnerId, 'closed', 'fixture', actor);
  await db
    .update(t.referralOutbox)
    .set({ nextAttemptAt: new Date(0) })
    .where(eq(t.referralOutbox.dedupeKey, `invite:${queuedMember.membershipId}:closed-resend`));
  await drainReferralOutbox();
  const [cancelled] = await db
    .select()
    .from(t.referralOutbox)
    .where(eq(t.referralOutbox.dedupeKey, `invite:${queuedMember.membershipId}:closed-resend`));
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(sent.length, delivered);
  console.log(
    'PASS: welcome creation, rollback, Admin/MCP parity, current terms, invitations, retry identity, suspension and closure (mock delivery).',
  );
}
main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });

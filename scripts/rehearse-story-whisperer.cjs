/* Rehearse the exact incremental SQL and voice account services with an in-memory
 * PostgreSQL instance. No network database, dotenv or provider client is used. */
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { generateMigration } = require('drizzle-kit/api');
const { drizzle } = require('drizzle-orm/pglite');

async function main() {
  const { PGlite } = require('@electric-sql/pglite');
  const pg = new PGlite();
  try {
    const baseline = JSON.parse(readFileSync('drizzle/meta/0050_snapshot.json', 'utf8'));
    const target = JSON.parse(readFileSync('drizzle/meta/0051_snapshot.json', 'utf8'));
    assert.equal(target.prevId, baseline.id);
    const empty = {
      ...baseline,
      tables: {},
      enums: {},
      schemas: {},
      sequences: {},
      roles: {},
      policies: {},
      views: {},
    };
    for (let ddl of await generateMigration(empty, baseline)) {
      if (/^CREATE INDEX "stories_is_(public|featured)_idx"/.test(ddl))
        ddl = ddl.replace(/ = \$1;/, ' = true;');
      assert.doesNotMatch(ddl, /\$\d+/, 'Unexpected parameter in synthetic baseline');
      await pg.exec(ddl);
    }
    const sql = readFileSync('drizzle/0051_story_whisperer.sql', 'utf8');
    assert.deepEqual(
      sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean),
      (await generateMigration(baseline, target)).map((s) => s.trim()),
    );
    await pg.exec('BEGIN');
    await pg.exec(sql);
    await pg.exec('ROLLBACK');
    assert.equal(
      (await pg.query("SELECT to_regclass('story_whisperer_interviews') AS name")).rows[0].name,
      null,
    );
    await pg.exec(sql);

    // Bind application services to the embedded client before loading any DB service.
    const dbPath = require.resolve('../src/db/index.ts');
    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: { db: drizzle(pg) },
    };
    const objects = new Map();
    let storageFailurePrefix;
    const bucket = {
      file: (path) => ({
        save: async (bytes) => {
          if (objects.has(path)) throw Object.assign(new Error('exists'), { code: 412 });
          objects.set(path, Buffer.from(bytes));
        },
        download: async () => [objects.get(path)],
        delete: async () => {
          objects.delete(path);
        },
      }),
      deleteFiles: async ({ prefix }) => {
        if (storageFailurePrefix === prefix) throw new Error('Isolated storage failure');
        for (const path of objects.keys()) if (path.startsWith(prefix)) objects.delete(path);
      },
    };
    const storagePath = require.resolve('@google-cloud/storage');
    require.cache[storagePath] = {
      id: storagePath,
      filename: storagePath,
      loaded: true,
      exports: {
        Storage: class {
          bucket(name) {
            assert.equal(name, 'isolated-recovery');
            return bucket;
          }
        },
      },
    };
    process.env.BIOGRAPHER_STORAGE_BUCKET = 'isolated-recovery';
    let assessmentCalls = 0;
    const sgwPath = require.resolve('../src/lib/sgw-client.ts');
    require.cache[sgwPath] = {
      id: sgwPath,
      filename: sgwPath,
      loaded: true,
      exports: {
        sgwFetch: async (path) => {
          assert.equal(path, '/api/biographer/whisperer');
          assessmentCalls++;
          return Response.json({
            readiness: {
              areas: { characters: 'ready', setting: 'ready', plot: 'ready' },
              hint: '',
            },
            question: 'What did Clara sing?',
          });
        },
      },
    };
    const {
      createProject,
      issueSession,
      admitSession,
      leaseSession,
      checkpoint,
    } = require('../src/db/services/biographer.ts');
    const { adminCommand } = require('../src/lib/biographer/admin.ts');
    process.env.BIOGRAPHER_LIVE_URL = 'ws://localhost:8082/live';
    process.env.BIOGRAPHER_ENABLED = 'true';
    const authorId = (
      await pg.query(
        "INSERT INTO authors(clerk_user_id, display_name, email) VALUES ('isolated','Rehearsal','rehearsal@example.invalid') RETURNING author_id",
      )
    ).rows[0].author_id;
    const draftId = (
      await pg.query(
        "INSERT INTO stories(author_id,title) VALUES ($1,'Independent wizard draft') RETURNING story_id",
        [authorId],
      )
    ).rows[0].story_id;
    const project = async () =>
      (await createProject(authorId, 'Rehearsal', { locale: 'en-US', consent: true })).project.id;
    const first = await project(),
      second = await project();
    await pg.query(
      'INSERT INTO story_whisperer_interviews(author_id,draft_id,project_id) VALUES ($1,$2,$3)',
      [authorId, draftId, first],
    );
    const firstTicket = await issueSession(authorId, first);
    assert.equal(firstTicket.remainingSeconds, 10800);
    const firstCall = await admitSession(firstTicket.ticket, first, firstTicket.sessionId);
    assert.equal(firstCall.mode, 'story-whisperer');
    await assert.rejects(admitSession(firstTicket.ticket, first, firstTicket.sessionId));
    const { saveSegment, readSegment } = require('../src/lib/biographer/storage.ts');
    const { sweepRecoveryAudio } = require('../src/lib/biographer/audio-retention.ts');
    const pcm = Buffer.alloc(3200);
    const segment = () => ({
      id: randomUUID(),
      turnId: randomUUID(),
      sequence: 0,
      contentType: 'audio/pcm;rate=16000',
      capturedAt: new Date().toISOString(),
      durationMs: 100,
      data: pcm.toString('base64'),
      sha256: createHash('sha256').update(pcm).digest('hex'),
    });
    const current = segment();
    await saveSegment(authorId, first, current);
    assert.deepEqual((await readSegment(authorId, first, current.id)).bytes, pcm);
    const other = segment();
    await saveSegment(authorId, first, other);
    await checkpoint({
      sessionId: firstTicket.sessionId,
      eventId: randomUUID(),
      turnId: current.turnId,
      role: 'user',
      text: 'An isolated fixture',
      final: true,
    });
    assert.equal(objects.size, 1);
    assert.deepEqual(await saveSegment(authorId, first, current), {
      saved: true,
      id: current.id,
      sequence: 0,
      sha256: current.sha256,
    });
    assert.equal(objects.size, 1);
    await pg.query(
      "UPDATE biographer_segments SET created_at=now()-interval '8 days' WHERE id=$1",
      [other.id],
    );
    await assert.rejects(readSegment(authorId, first, other.id), (err) => err.status === 410);
    assert.equal((await sweepRecoveryAudio()).removed, 1);
    assert.equal(objects.size, 0);
    await assert.rejects(
      saveSegment(authorId, first, {
        ...other,
        capturedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      }),
      (err) => err.status === 410,
    );
    const secondTicket = await issueSession(authorId, second);
    assert.equal(secondTicket.remainingSeconds, 10740);
    const secondCall = await admitSession(secondTicket.ticket, second, secondTicket.sessionId);
    const actor = { email: 'staff@example.invalid' };
    const extension = {
      operation: 'extendAllowance',
      actor,
      input: {
        projectId: first,
        additionalSeconds: 120,
        requestId: randomUUID(),
        reason: 'Isolated rehearsal',
      },
    };
    await adminCommand(extension, 'staff-service');
    await adminCommand(extension, 'staff-service');
    await assert.rejects(
      adminCommand(
        { ...extension, input: { ...extension.input, additionalSeconds: 180 } },
        'staff-service',
      ),
    );
    const inspect = () =>
      adminCommand(
        { operation: 'getProject', actor, input: { projectId: second } },
        'staff-service',
      );
    assert.equal((await inspect()).liveSecondsLimit, 10920);
    assert.equal((await inspect()).liveSecondsUsed, 120);
    await adminCommand(
      {
        operation: 'setLiveEnabled',
        actor,
        input: {
          projectId: first,
          enabled: false,
          reason: 'Isolated pause',
          requestId: randomUUID(),
        },
      },
      'staff-service',
    );
    assert.equal((await leaseSession(secondTicket.sessionId, secondCall.leaseId)).allowed, false);
    await assert.rejects(issueSession(authorId, second));
    const { resetWhisperer } = require('../src/lib/story-whisperer/server.ts');
    const {
      startWhisperer,
      sendWhispererTurn,
      handoffWhisperer,
      verifyWhispererStructure,
      getWhisperer,
      deleteStoryWithWhispererCleanup,
    } = require('../src/lib/story-whisperer/server.ts');
    const textDraft = (
      await pg.query(
        "INSERT INTO stories(author_id,title) VALUES ($1,'Text fixture') RETURNING story_id",
        [authorId],
      )
    ).rows[0].story_id;
    const opened = await startWhisperer(authorId, 'Rehearsal', textDraft, {
      locale: 'en-US',
      consent: true,
    });
    const textProject = opened.interview.projectId;
    const handoff = (revision) =>
      handoffWhisperer(authorId, textDraft, textProject, {
        revision,
        brief: '',
        imageObjectPaths: [],
      });
    await assert.rejects(handoff(opened.interview.revision), (err) => err.status === 409);
    const answer = {
      id: randomUUID(),
      text: 'Clara sings while she bakes in Porto. When the river floods she feeds everyone on the hill.',
    };
    const result = await sendWhispererTurn(authorId, textDraft, textProject, answer);
    await sendWhispererTurn(authorId, textDraft, textProject, answer);
    assert.equal(assessmentCalls, 1);
    const resumed = await getWhisperer(authorId, textDraft);
    assert.equal(resumed.interview.turns.length, 2);
    assert.equal(resumed.interview.readiness.ready, true);
    const accepted = await handoff(result.revision);
    assert.deepEqual(await handoff(result.revision), accepted);
    assert.ok(accepted.userDescription.includes(answer.text));
    assert.ok(!accepted.userDescription.includes('What did Clara sing?'));
    await verifyWhispererStructure(
      authorId,
      textDraft,
      accepted.structureRequestId,
      accepted.userDescription,
      [],
    );
    await resetWhisperer(authorId, textDraft, textProject);
    // If dispatch succeeded but the browser lost the acknowledgement, the same
    // authorized request can still be replayed after the interview is removed.
    await verifyWhispererStructure(
      authorId,
      textDraft,
      accepted.structureRequestId,
      accepted.userDescription,
      [],
    );
    const replacement = await startWhisperer(authorId, 'Rehearsal', textDraft, {
      locale: 'en-US',
      consent: true,
    });
    assert.notEqual(replacement.interview.projectId, textProject);
    await assert.rejects(
      sendWhispererTurn(authorId, textDraft, textProject, answer),
      (err) => err.status === 409 || err.status === 404,
    );
    assert.equal((await getWhisperer(authorId, textDraft)).interview.turns.length, 0);
    await resetWhisperer(authorId, draftId, first);
    await assert.rejects(
      checkpoint({
        sessionId: firstTicket.sessionId,
        eventId: randomUUID(),
        turnId: randomUUID(),
        role: 'user',
        text: 'stale',
        final: true,
      }),
      (err) => err.status === 404,
    );
    assert.equal((await inspect()).liveSecondsLimit, 10920);
    assert.equal(
      (await pg.query('SELECT count(*)::int AS n FROM story_whisperer_voice_actions')).rows[0].n,
      2,
    );
    assert.equal(
      (await pg.query('SELECT count(*)::int AS n FROM stories WHERE story_id=$1', [draftId]))
        .rows[0].n,
      1,
    );
    // Permanent story deletion closes admissions before attempting either
    // private storage purge. A failed purge keeps the rows needed to retry.
    await adminCommand(
      {
        operation: 'setLiveEnabled',
        actor,
        input: {
          projectId: second,
          enabled: true,
          reason: 'Isolated deletion rehearsal',
          requestId: randomUUID(),
        },
      },
      'staff-service',
    );
    const deletedProject = replacement.interview.projectId;
    const ownSource = `biographer/${deletedProject}/owner/photos/reference`;
    const neighborSource = `biographer/${second}/owner/photos/reference`;
    const ownHandoff = `${textDraft}/inputs/whisperer-snapshot.json`;
    const neighborHandoff = `${draftId}/inputs/whisperer-snapshot.json`;
    for (const key of [ownSource, neighborSource, ownHandoff, neighborHandoff])
      objects.set(key, Buffer.from('Isolated media'));
    const deletionTicket = await issueSession(authorId, deletedProject);
    await admitSession(deletionTicket.ticket, deletedProject, deletionTicket.sessionId);
    const deletionTurn = randomUUID();
    await checkpoint({
      sessionId: deletionTicket.sessionId,
      eventId: randomUUID(),
      turnId: deletionTurn,
      role: 'user',
      text: 'Deleted transcript',
      final: true,
    });
    await assert.rejects(
      deleteStoryWithWhispererCleanup(randomUUID(), textDraft),
      (err) => err.status === 404,
    );
    assert.equal(objects.has(ownSource), true);
    storageFailurePrefix = `${textDraft}/inputs/whisperer-`;
    await assert.rejects(
      deleteStoryWithWhispererCleanup(authorId, textDraft),
      /Isolated storage failure/,
    );
    const pending = await pg.query(
      'SELECT status,live_enabled FROM biographer_projects WHERE id=$1',
      [deletedProject],
    );
    assert.deepEqual(pending.rows, [{ status: 'deleting', live_enabled: false }]);
    const ticket = await pg.query(
      'SELECT ended_at,reserved_seconds FROM biographer_sessions WHERE id=$1',
      [deletionTicket.sessionId],
    );
    assert.ok(ticket.rows[0].ended_at);
    assert.equal(ticket.rows[0].reserved_seconds, 0);
    await assert.rejects(getWhisperer(authorId, textDraft), (err) => err.status === 410);
    assert.equal(objects.has(ownSource), false);
    assert.equal(objects.has(ownHandoff), true);

    storageFailurePrefix = undefined;
    await pg.exec(`
      CREATE FUNCTION reject_test_story_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'Isolated database failure';
      END;
      $$;
      CREATE TRIGGER reject_test_story_delete BEFORE DELETE ON stories
        FOR EACH ROW EXECUTE PROCEDURE reject_test_story_delete();
    `);
    await assert.rejects(deleteStoryWithWhispererCleanup(authorId, textDraft), (error) =>
      String(error.cause?.message).includes('Isolated database failure'),
    );
    const rolledBack = await pg.query('SELECT status FROM biographer_projects WHERE id=$1', [
      deletedProject,
    ]);
    assert.deepEqual(rolledBack.rows, [{ status: 'deleting' }]);
    await pg.exec('DROP TRIGGER reject_test_story_delete ON stories');
    await deleteStoryWithWhispererCleanup(authorId, textDraft.toUpperCase());
    assert.equal(objects.has(ownHandoff), false);
    assert.equal(objects.has(neighborSource), true);
    assert.equal(objects.has(neighborHandoff), true);
    const deletedCounts = await pg.query(
      `SELECT (SELECT count(*)::int FROM stories WHERE story_id=$1) AS stories,
              (SELECT count(*)::int FROM biographer_projects WHERE id=$2) AS projects,
              (SELECT count(*)::int FROM biographer_turns WHERE id=$3) AS turns,
              (SELECT count(*)::int FROM story_whisperer_handoffs WHERE draft_id=$1) AS handoffs,
              (SELECT count(*)::int FROM story_whisperer_deleted_drafts WHERE draft_id=$1) AS tombstones`,
      [textDraft, deletedProject, deletionTurn],
    );
    assert.deepEqual(deletedCounts.rows, [
      { stories: 0, projects: 0, turns: 0, handoffs: 0, tombstones: 1 },
    ]);
    await assert.rejects(
      startWhisperer(authorId, 'Rehearsal', textDraft, { locale: 'en-US', consent: true }),
      (err) => err.status === 410,
    );
    assert.equal(
      (await pg.query('SELECT count(*)::int AS n FROM stories WHERE story_id=$1', [draftId]))
        .rows[0].n,
      1,
    );
    console.log(
      'Passed: migration SQL and rollback, wizard draft survival, audio expiry and transcript purge, stale checkpoints, admission replay, shared allowance, audited extension and pause, and scoped permanent deletion with retry.',
    );
  } finally {
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

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
    let storageFailure;
    let disappearDuringDelete;
    let pauseStorageDelete;
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
      deleteFiles: async ({ prefix, force }) => {
        await pauseStorageDelete?.(prefix);
        if (storageFailurePrefix === prefix)
          throw storageFailure ?? new Error('Isolated storage failure');
        const errors = [];
        for (const path of [...objects.keys()].filter((key) => key.startsWith(prefix))) {
          if (path === disappearDuringDelete) {
            objects.delete(path);
            disappearDuringDelete = undefined;
            const error = Object.assign(new Error('Object disappeared'), { code: 404 });
            if (!force) throw error;
            errors.push(error);
          }
          objects.delete(path);
        }
        if (errors.length) throw errors;
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
    let failNextQuestion = false;
    let pauseAssessment;
    const andreaMaterial = [
      'Andrea e André na Escola Secundária Almeida Garrett, em Vila Nova de Gaia.',
      'Foi no outono de 1993, na turma 12.º B. Cheguei numa Aprilia Classic 50 cc azul.',
      'A Andrea olhou para mim e disse: “Esse lugar é meu.”',
    ];
    const sgwPath = require.resolve('../src/lib/sgw-client.ts');
    require.cache[sgwPath] = {
      id: sgwPath,
      filename: sgwPath,
      loaded: true,
      exports: {
        sgwFetch: async (path, options) => {
          assert.equal(path, '/api/biographer/whisperer');
          assessmentCalls++;
          if (failNextQuestion) {
            failNextQuestion = false;
            return new Response(null, { status: 503 });
          }
          const input = JSON.parse(options.body);
          if (input.turns.some(({ text }) => text === andreaMaterial[0])) {
            const evidence = input.turns
              .filter(({ role }) => role === 'user')
              .map(({ text }) => text);
            if (!input.requestQuestion) await pauseAssessment?.();
            return Response.json({
              question: 'O que disse a Andrea?',
              readiness: {
                rubricVersion: 3,
                areas: {
                  characters: 'ready',
                  setting: 'ready',
                  plot: andreaMaterial.every((text) => evidence.includes(text))
                    ? 'ready'
                    : 'missing',
                },
                hint: '',
              },
            });
          }
          if (input.locale === 'pt-PT') {
            assert.equal(input.context.primaryIntent, 'romance');
            assert.equal(input.context.opening.choices.length, 4);
            const answers = input.turns.filter((line) => line.role === 'user');
            const ready = answers.some((line) => line.text.includes('bilhete'));
            return Response.json({
              question:
                answers.length === 1
                  ? 'Como gostaria de chamar à sua mulher na história?'
                  : 'Em que escola conheceu a Inês?',
              readiness: {
                rubricVersion: 3,
                areas: {
                  characters: ready ? 'ready' : 'developing',
                  setting: ready ? 'ready' : 'developing',
                  plot: ready ? 'ready' : 'missing',
                },
                hint: ready ? '' : 'Conte um episódio na escola.',
              },
            });
          }
          return Response.json({
            readiness: {
              rubricVersion: 3,
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
      cancelWhispererSession,
      whispererSessionStatus,
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
    // Use the still-supported historical Biographer upload path to seed older recordings.
    const current = segment();
    await saveSegment(authorId, first, current);
    const other = segment();
    await saveSegment(authorId, first, other);
    await pg.query(
      'INSERT INTO story_whisperer_interviews(author_id,draft_id,project_id) VALUES ($1,$2,$3)',
      [authorId, draftId, first],
    );
    const firstTicket = await issueSession(authorId, first);
    assert.equal(firstTicket.remainingSeconds, 10800);
    assert.deepEqual(await whispererSessionStatus(authorId, first, firstTicket.sessionId), {
      settled: true,
    });
    const firstCall = await admitSession(firstTicket.ticket, first, firstTicket.sessionId);
    assert.equal(firstCall.mode, 'story-whisperer');
    await assert.rejects(admitSession(firstTicket.ticket, first, firstTicket.sessionId));
    assert.deepEqual(await whispererSessionStatus(authorId, first, firstTicket.sessionId), {
      settled: false,
    });
    await assert.rejects(
      whispererSessionStatus(randomUUID(), first, firstTicket.sessionId),
      (err) => err.status === 404,
    );
    const oldClientUpload = segment();
    await assert.rejects(
      saveSegment(authorId, first, oldClientUpload),
      (err) => err.status === 410,
    );
    assert.equal(objects.size, 2);
    assert.deepEqual(
      (await pg.query('SELECT id FROM biographer_turns WHERE id=$1', [oldClientUpload.turnId]))
        .rows,
      [],
    );
    assert.deepEqual((await readSegment(authorId, first, current.id)).bytes, pcm);
    await checkpoint({
      sessionId: firstTicket.sessionId,
      eventId: randomUUID(),
      turnId: current.turnId,
      role: 'user',
      text: 'An isolated fixture',
      final: true,
    });
    assert.equal(objects.size, 1);
    await assert.rejects(saveSegment(authorId, first, current), (err) => err.status === 410);
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
      refreshWhispererReadiness,
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
    });
    const textProject = opened.interview.projectId;
    assert.equal(
      (
        await pg.query('SELECT consent_at FROM biographer_participants WHERE project_id = $1', [
          textProject,
        ])
      ).rows[0].consent_at,
      null,
    );
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

    // Reopen the same saved revision with a previously accepted rubric result.
    await pg.query('UPDATE story_whisperer_interviews SET readiness = $1 WHERE project_id = $2', [
      JSON.stringify({
        ...resumed.interview.readiness,
        rubricVersion: 2,
        firstReadyTurnId: randomUUID(),
      }),
      textProject,
    ]);
    const stale = (await getWhisperer(authorId, textDraft)).interview;
    assert.equal(stale.revision, result.revision);
    assert.equal(stale.readinessNeedsRefresh, true);
    assert.equal(stale.readiness.ready, false);
    assert.equal(stale.readiness.firstReadyTurnId, undefined);
    assert.deepEqual(stale.turns, resumed.interview.turns);
    await assert.rejects(handoff(stale.revision), (err) => err.status === 409);
    const refreshed = await refreshWhispererReadiness(authorId, textDraft, textProject);
    assert.equal(refreshed.revision, result.revision);
    assert.deepEqual(refreshed.readiness, resumed.interview.readiness);
    assert.equal(assessmentCalls, 2);
    const accepted = await handoff(refreshed.revision);
    assert.deepEqual(await handoff(result.revision), accepted);
    assert.ok(accepted.userDescription.includes(answer.text));
    assert.ok(!accepted.userDescription.includes('What did Clara sing?'));
    assert.deepEqual(result.interview, resumed.interview);

    // Real application services and embedded PostgreSQL across the text/voice
    // boundary. Model replies and final voice transcripts are synthetic.
    const inesAuthor = (
      await pg.query(
        "INSERT INTO authors(clerk_user_id, display_name, email) VALUES ('ines-test','Test','ines@example.invalid') RETURNING author_id",
      )
    ).rows[0].author_id;
    const inesDraft = (
      await pg.query(
        "INSERT INTO stories(author_id,title) VALUES ($1,'Synthetic school encounter') RETURNING story_id",
        [inesAuthor],
      )
    ).rows[0].story_id;
    const ines = (
      await startWhisperer(inesAuthor, 'Teste', inesDraft, {
        locale: 'pt-PT',
        primaryIntent: 'romance',
      })
    ).interview;
    const sendText = (text) =>
      sendWhispererTurn(inesAuthor, inesDraft, ines.projectId, { id: randomUUID(), text });
    const relationship = await sendText(ines.opening.choices[0]);
    assert.equal(relationship.readiness.areas.characters, 'developing');
    const typed = await sendText('Chama-se Inês. Conhecemo-nos na escola.');
    assert.equal(typed.readiness.ready, false);
    assert.equal(typed.interview.turns.at(-1).text, 'Em que escola conheceu a Inês?');
    const resumedInes = (
      await startWhisperer(inesAuthor, 'Teste', inesDraft, {
        locale: 'pt-PT',
        primaryIntent: 'sports_teams',
      })
    ).interview;
    assert.deepEqual(resumedInes, typed.interview);
    const voiceTicket = await issueSession(inesAuthor, ines.projectId);
    const admission = await admitSession(voiceTicket.ticket, ines.projectId, voiceTicket.sessionId);
    assert.deepEqual(admission.context.opening, ines.opening);
    assert.equal(admission.context.primaryIntent, 'romance');
    assert.deepEqual(
      admission.history.map(({ role, text }) => ({ role, text })),
      typed.interview.turns.map(({ role, text }) => ({ role, text })),
    );
    const conversation = [
      ['user', 'Na Escola Secundária de Camões, em Lisboa.'],
      ['assistant', 'Em que ano se conheceram?'],
      ['user', 'Talvez em 1998.'],
      ['assistant', 'O que fez a Inês naquele dia?'],
      ['user', 'Emprestou-me O Principezinho, com um bilhete lá dentro.'],
      ['assistant', 'Era um bilhete de comboio para Paris?'],
    ];
    for (const [role, text] of conversation) {
      await checkpoint({
        sessionId: voiceTicket.sessionId,
        eventId: randomUUID(),
        turnId: randomUUID(),
        role,
        text,
        final: true,
      });
    }
    const reloaded = (await getWhisperer(inesAuthor, inesDraft)).interview;
    assert.equal(reloaded.readinessNeedsRefresh, true);
    const progress = await refreshWhispererReadiness(inesAuthor, inesDraft, ines.projectId);
    assert.equal(progress.readiness.ready, true);
    const outlineInput = await handoffWhisperer(inesAuthor, inesDraft, ines.projectId, {
      revision: progress.revision,
      brief: '',
      imageObjectPaths: [],
    });
    await verifyWhispererStructure(
      inesAuthor,
      inesDraft,
      outlineInput.structureRequestId,
      outlineInput.userDescription,
      [],
    );
    const notes = outlineInput.userDescription.split('\n\n').map((line) => JSON.parse(line));
    assert.ok(
      notes.some(
        (note) =>
          note.interviewerQuestion === 'Em que escola conheceu a Inês?' &&
          note.authorReply.includes('Camões, em Lisboa'),
      ),
    );
    assert.ok(
      notes.some(
        (note) =>
          note.interviewerQuestion === 'Em que ano se conheceram?' &&
          note.authorReply === 'Talvez em 1998.',
      ),
    );
    assert.ok(notes.some((note) => note.authorReply.includes('O Principezinho, com um bilhete')));
    assert.ok(!outlineInput.userDescription.includes('Paris'));

    // Author finishes the Andrea scene by voice while the assistant keeps speaking.
    const andreaDraft = (
      await pg.query(
        "INSERT INTO stories(author_id,title) VALUES ($1,'Synthetic Andrea encounter') RETURNING story_id",
        [inesAuthor],
      )
    ).rows[0].story_id;
    const andrea = (
      await startWhisperer(inesAuthor, 'Teste', andreaDraft, {
        locale: 'pt-PT',
        primaryIntent: 'romance',
      })
    ).interview;
    const andreaTyped = await sendWhispererTurn(inesAuthor, andreaDraft, andrea.projectId, {
      id: randomUUID(),
      text: andreaMaterial[0],
    });
    assert.equal(andreaTyped.readiness.ready, false);
    const andreaTicket = await issueSession(inesAuthor, andrea.projectId);
    await admitSession(andreaTicket.ticket, andrea.projectId, andreaTicket.sessionId);
    const say = (role, text, final, turnId = randomUUID()) =>
      checkpoint({
        sessionId: andreaTicket.sessionId,
        eventId: randomUUID(),
        turnId,
        role,
        text,
        final,
      });
    const setting = randomUUID();
    await say('user', 'Foi no outono', false, setting);
    assert.equal(
      (await getWhisperer(inesAuthor, andreaDraft)).interview.readinessNeedsRefresh,
      false,
    );
    await say('user', andreaMaterial[1], true, setting);
    const interruptedScene = randomUUID();
    await say('user', 'A Andrea olhou', false, interruptedScene);
    await say('user', andreaMaterial[2], true, interruptedScene);

    const beforeLiveAssessment = assessmentCalls;
    const assessmentStarted = Promise.withResolvers();
    const allowAssessment = Promise.withResolvers();
    pauseAssessment = () => {
      assessmentStarted.resolve();
      return allowAssessment.promise;
    };
    const assessAndrea = () => refreshWhispererReadiness(inesAuthor, andreaDraft, andrea.projectId);
    const tabOne = assessAndrea();
    await Promise.race([assessmentStarted.promise, tabOne]);
    const tabTwo = assessAndrea();
    const trailing = randomUUID();
    try {
      await say('assistant', 'Terá disparado', false, trailing);
      await say('assistant', 'Terá disparado o alarme?', true, trailing);
    } finally {
      allowAssessment.resolve();
    }
    const progressTabs = await Promise.all([tabOne, tabTwo]);
    pauseAssessment = undefined;
    assert.ok(progressTabs.every(({ readiness }) => readiness.ready));
    assert.equal(assessmentCalls - beforeLiveAssessment, 1);
    const andreaReopened = (await getWhisperer(inesAuthor, andreaDraft)).interview;
    assert.equal(andreaReopened.readinessNeedsRefresh, false);
    const andreaOutline = await handoffWhisperer(inesAuthor, andreaDraft, andrea.projectId, {
      revision: andreaReopened.revision,
      brief: '',
      imageObjectPaths: [],
    });
    await verifyWhispererStructure(
      inesAuthor,
      andreaDraft,
      andreaOutline.structureRequestId,
      andreaOutline.userDescription,
      [],
    );
    for (const material of andreaMaterial)
      assert.ok(andreaOutline.userDescription.includes(material));
    assert.ok(!andreaOutline.userDescription.includes('alarme'));
    console.log(
      'Passed: Andrea voice-to-outline handoff and one shared assessment across two tabs.',
    );

    const multiTabDraft = randomUUID();
    const multiTabProject = (
      await startWhisperer(inesAuthor, 'Teste', multiTabDraft, { locale: 'en-US' })
    ).interview.projectId;
    const submit = (answer) =>
      sendWhispererTurn(inesAuthor, multiTabDraft, multiTabProject, answer);
    const older = { id: randomUUID(), text: 'First answer from another tab.' };
    failNextQuestion = true;
    await assert.rejects(submit(older), (error) => error.status === 503);
    const newer = await submit({ id: randomUUID(), text: 'Second answer.' });
    const beforeReplay = assessmentCalls;
    const lateReplay = await submit(older);
    assert.equal(assessmentCalls, beforeReplay);
    assert.equal(lateReplay.question, null);
    assert.deepEqual(lateReplay.interview, newer.interview);
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
    assert.ok(
      (
        await pg.query('SELECT consent_at FROM biographer_participants WHERE project_id = $1', [
          replacement.interview.projectId,
        ])
      ).rows[0].consent_at,
    );
    await assert.rejects(
      sendWhispererTurn(authorId, textDraft, textProject, answer),
      (err) => err.status === 409 || err.status === 404,
    );
    assert.equal((await getWhisperer(authorId, textDraft)).interview.turns.length, 0);
    const resetSource = `biographer/${first}/owner/photos/reference`;
    const resetAudio = `biographer/${first}/owner/audio/recovery`;
    const resetRequest = randomUUID();
    const emptyRequest = randomUUID();
    const reservedRequest = randomUUID();
    const resetPrefix = `${draftId}/inputs/whisperer-${resetRequest}-`;
    const resetCopy = `${resetPrefix}copy.jpg`;
    const reservedCopy = `${draftId}/inputs/whisperer-${reservedRequest}-copy.jpg`;
    const ordinaryInput = `${draftId}/inputs/ordinary-input.jpg`;
    const neighboringProject = `biographer/${second}/owner/photos/reference`;
    for (const [requestId, paths, reserved] of [
      [resetRequest, [resetCopy], false],
      [emptyRequest, [`${draftId}/inputs/whisperer-${emptyRequest}-missing.jpg`], false],
      [reservedRequest, [reservedCopy], true],
    ]) {
      await pg.query(
        `INSERT INTO story_whisperer_handoffs
         (request_id,draft_id,project_id,revision,user_description,image_object_paths,dispatch_reserved)
         VALUES ($1,$2,$3,0,'Isolated snapshot',$4,$5)`,
        [requestId, draftId, first, JSON.stringify(paths), reserved],
      );
    }
    for (const key of [
      resetSource,
      resetAudio,
      resetCopy,
      reservedCopy,
      ordinaryInput,
      neighboringProject,
    ])
      objects.set(key, Buffer.from('Isolated reset media'));

    storageFailurePrefix = resetPrefix;
    storageFailure = Object.assign(new Error('Isolated list failure'), { code: 404 });
    await assert.rejects(resetWhisperer(authorId, draftId, first), /Isolated list failure/);
    storageFailure = [
      Object.assign(new Error('Object disappeared'), { code: 404 }),
      Object.assign(new Error('Object delete unavailable'), { code: 503 }),
    ];
    await assert.rejects(resetWhisperer(authorId, draftId, first), (err) => err === storageFailure);
    const pendingReset = await pg.query(
      `SELECT p.status,p.live_enabled,s.ended_at,s.reserved_seconds
       FROM biographer_projects p JOIN biographer_sessions s ON s.project_id=p.id
       WHERE p.id=$1 AND s.id=$2`,
      [first, firstTicket.sessionId],
    );
    assert.equal(pendingReset.rows[0].status, 'deleting');
    assert.equal(pendingReset.rows[0].live_enabled, false);
    assert.ok(pendingReset.rows[0].ended_at);
    assert.equal(pendingReset.rows[0].reserved_seconds, 0);
    assert.equal(objects.has(resetCopy), true);
    assert.deepEqual(await getWhisperer(authorId, draftId), { interview: null });
    await assert.rejects(issueSession(authorId, first));
    assert.equal(
      (
        await pg.query(
          'SELECT count(*)::int AS n FROM story_whisperer_handoffs WHERE project_id=$1',
          [first],
        )
      ).rows[0].n,
      3,
    );

    storageFailurePrefix = undefined;
    storageFailure = undefined;
    disappearDuringDelete = resetCopy;
    const storageStarted = Promise.withResolvers();
    const releaseStorage = Promise.withResolvers();
    pauseStorageDelete = (prefix) => {
      if (prefix !== resetPrefix) return;
      storageStarted.resolve();
      return releaseStorage.promise;
    };
    let resetConfirmed = false;
    const retryReset = resetWhisperer(authorId, draftId, first).then((result) => {
      resetConfirmed = true;
      return result;
    });
    try {
      await Promise.race([storageStarted.promise, retryReset]);
      assert.equal(resetConfirmed, false);
      assert.equal(objects.has(resetCopy), true);
      assert.deepEqual(
        (await pg.query('SELECT status FROM biographer_projects WHERE id=$1', [first])).rows,
        [{ status: 'deleting' }],
      );
    } finally {
      releaseStorage.resolve();
      pauseStorageDelete = undefined;
    }
    assert.deepEqual(await retryReset, { interview: null });
    assert.equal(disappearDuringDelete, undefined);
    for (const key of [resetSource, resetAudio, resetCopy]) assert.equal(objects.has(key), false);
    for (const key of [reservedCopy, ordinaryInput, neighboringProject])
      assert.equal(objects.has(key), true);
    const resetRows = await pg.query(
      `SELECT (SELECT count(*)::int FROM biographer_projects WHERE id=$1) AS projects,
              (SELECT count(*)::int FROM biographer_turns WHERE project_id=$1) AS turns,
              (SELECT count(*)::int FROM biographer_sessions WHERE project_id=$1) AS sessions,
              (SELECT count(*)::int FROM story_whisperer_handoffs WHERE request_id IN ($2,$3)) AS unreserved,
              (SELECT count(*)::int FROM story_whisperer_handoffs WHERE request_id=$4 AND project_id IS NULL) AS reserved`,
      [first, resetRequest, emptyRequest, reservedRequest],
    );
    assert.deepEqual(resetRows.rows, [
      { projects: 0, turns: 0, sessions: 0, unreserved: 0, reserved: 1 },
    ]);
    assert.deepEqual(await resetWhisperer(authorId, draftId, first), { interview: null });
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
      startWhisperer(authorId, 'Rehearsal', textDraft, { locale: 'en-US' }),
      (err) => err.status === 410,
    );
    assert.equal(
      (await pg.query('SELECT count(*)::int AS n FROM stories WHERE story_id=$1', [draftId]))
        .rows[0].n,
      1,
    );
    const priorTicket = await issueSession(inesAuthor, ines.projectId);
    const priorLease = await admitSession(
      priorTicket.ticket,
      ines.projectId,
      priorTicket.sessionId,
    );
    const priorPartial = randomUUID();
    await checkpoint({
      sessionId: priorTicket.sessionId,
      eventId: randomUUID(),
      turnId: priorPartial,
      role: 'user',
      text: 'Earlier recoverable text',
      final: false,
    });
    await leaseSession(priorTicket.sessionId, priorLease.leaseId, true);
    const cancelTicket = await issueSession(inesAuthor, ines.projectId);
    const cancelLease = await admitSession(
      cancelTicket.ticket,
      ines.projectId,
      cancelTicket.sessionId,
    );
    const unfinished = randomUUID();
    const assistantTurn = randomUUID();
    const queuedFinal = randomUUID();
    const saveVoice = (turnId, role, text, final) =>
      checkpoint({
        sessionId: cancelTicket.sessionId,
        eventId: randomUUID(),
        turnId,
        role,
        text,
        final,
      });
    await saveVoice(unfinished, 'user', 'unfinished fragment', false);
    await saveVoice(assistantTurn, 'assistant', 'unfinished question', false);
    const discard = (turnId) =>
      cancelWhispererSession(inesAuthor, ines.projectId, cancelTicket.sessionId, turnId);
    await discard(priorPartial);
    await discard(unfinished);
    await discard(queuedFinal);
    await saveVoice(unfinished, 'user', 'late partial fragment', false);
    await saveVoice(queuedFinal, 'user', 'A completed turn already in the queue.', true);
    await leaseSession(cancelTicket.sessionId, cancelLease.leaseId, true, [
      unfinished,
      assistantTurn,
    ]);
    assert.deepEqual(
      await whispererSessionStatus(inesAuthor, ines.projectId, cancelTicket.sessionId),
      {
        settled: true,
      },
    );
    const afterCancel = (await getWhisperer(inesAuthor, inesDraft)).interview;
    assert(!afterCancel.turns.some(({ id }) => [unfinished, assistantTurn].includes(id)));
    assert(afterCancel.turns.some(({ id, final }) => id === queuedFinal && final));
    assert(afterCancel.turns.some(({ id, final }) => id === priorPartial && !final));
    assert(afterCancel.turns.some(({ text }) => text === conversation[0][1]));
    const unadmitted = await issueSession(inesAuthor, ines.projectId);
    await cancelWhispererSession(inesAuthor, ines.projectId, unadmitted.sessionId);
    await assert.rejects(
      admitSession(unadmitted.ticket, ines.projectId, unadmitted.sessionId),
      (err) => err.status === 401,
    );
    console.log(
      'Passed: migration SQL and rollback, wizard draft survival, voice cancellation and recovery, audio retention, stale checkpoints, admission replay, shared allowance, audited controls, scoped reset and deletion.',
    );
  } finally {
    await pg.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

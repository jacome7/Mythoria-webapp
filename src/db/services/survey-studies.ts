import { and, asc, desc, eq, inArray, notInArray, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  surveys,
  surveyStudies,
  surveyStudyCohorts,
  surveyVersions,
  surveyInvitations,
  type SurveyStudy,
  type SurveyStudyCohort,
  type SurveyStudyStatus,
} from '@/db/schema/surveys';
import { getPublishedSurveyVersion } from '@/db/services/surveys';
import { SURVEY_COHORT_KEYS, type SurveyCohortKey } from '@/lib/surveys/cohorts';
import { SurveyAdminError } from '@/lib/surveys/errors';
import { SUPPORTED_LOCALES_CANONICAL } from '@/lib/surveys/locales';

type SurveyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = SurveyTransaction | typeof db;

export const DEFAULT_NOTIFICATION_PREFERENCES = ['news', 'inspiration'] as const;
const KNOWN_NOTIFICATION_PREFERENCES = ['essential', 'inspiration', 'news'] as const;

export interface StudyCohortInput {
  cohortKey: string;
  surveyId: string;
  version: number;
}

export interface CreateStudyInput {
  studyKey: string;
  title: string;
  opensAt?: Date | null;
  closesAt?: Date | null;
  holdoutPercent: number;
  rewardPolicy?: Record<string, unknown> | null;
  cohorts: StudyCohortInput[];
}

export type UpdateStudyInput = Partial<Omit<CreateStudyInput, 'studyKey'>>;

export interface StudyCohortView extends SurveyStudyCohort {
  surveyId: string;
  version: number;
}

export interface StudyView {
  study: SurveyStudy;
  cohorts: StudyCohortView[];
}

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

/** Surveys with their published versions. Definitions are intentionally omitted (large). */
export async function listSurveys() {
  const [surveyRows, versionRows] = await Promise.all([
    db.select().from(surveys).orderBy(asc(surveys.surveyId)),
    db
      .select({
        surveyVersionId: surveyVersions.surveyVersionId,
        surveyId: surveyVersions.surveyId,
        version: surveyVersions.version,
        schemaVersion: surveyVersions.schemaVersion,
        definitionHash: surveyVersions.definitionHash,
        publishedAt: surveyVersions.publishedAt,
      })
      .from(surveyVersions)
      .orderBy(asc(surveyVersions.surveyId), asc(surveyVersions.version)),
  ]);
  return surveyRows.map((survey) => ({
    ...survey,
    versions: versionRows.filter((version) => version.surveyId === survey.surveyId),
  }));
}

async function loadCohorts(executor: Executor, studyIds: string[]): Promise<StudyCohortView[]> {
  if (studyIds.length === 0) return [];
  const rows = await executor
    .select({
      cohort: surveyStudyCohorts,
      surveyId: surveyVersions.surveyId,
      version: surveyVersions.version,
    })
    .from(surveyStudyCohorts)
    .innerJoin(
      surveyVersions,
      eq(surveyVersions.surveyVersionId, surveyStudyCohorts.surveyVersionId),
    )
    .where(inArray(surveyStudyCohorts.studyId, studyIds))
    .orderBy(asc(surveyStudyCohorts.cohortKey));
  return rows.map((row) => ({ ...row.cohort, surveyId: row.surveyId, version: row.version }));
}

export async function listStudies(): Promise<StudyView[]> {
  const studies = await db.select().from(surveyStudies).orderBy(desc(surveyStudies.createdAt));
  const cohorts = await loadCohorts(
    db,
    studies.map((study) => study.studyId),
  );
  return studies.map((study) => ({
    study,
    cohorts: cohorts.filter((cohort) => cohort.studyId === study.studyId),
  }));
}

async function requireStudy(executor: Executor, studyId: string): Promise<SurveyStudy> {
  const rows = await executor
    .select()
    .from(surveyStudies)
    .where(eq(surveyStudies.studyId, studyId))
    .limit(1);
  if (!rows[0]) throw new SurveyAdminError('study_not_found', 'Study not found', 404);
  return rows[0];
}

export type InvitationCounts = Record<string, Record<string, number>>;

export async function getStudy(studyId: string) {
  const study = await requireStudy(db, studyId);
  const [cohorts, countRows] = await Promise.all([
    loadCohorts(db, [studyId]),
    db
      .select({
        cohortKey: surveyInvitations.cohortKey,
        status: surveyInvitations.status,
        isHoldout: surveyInvitations.isHoldout,
        count: sql<number>`count(*)::int`,
      })
      .from(surveyInvitations)
      .where(eq(surveyInvitations.studyId, studyId))
      .groupBy(surveyInvitations.cohortKey, surveyInvitations.status, surveyInvitations.isHoldout),
  ]);

  // Holdout invitations are never emailed, so they are reported apart from the invited funnel.
  const invitationCounts: InvitationCounts = {};
  const holdoutCounts: Record<string, number> = {};
  for (const row of countRows) {
    const count = Number(row.count);
    if (row.isHoldout) {
      holdoutCounts[row.cohortKey] = (holdoutCounts[row.cohortKey] ?? 0) + count;
    } else {
      (invitationCounts[row.cohortKey] ??= {})[row.status] = count;
    }
  }
  return { study, cohorts, invitationCounts, holdoutCounts };
}

/** Light lookup used by the tracked campaign link to pick the respondent's locale. */
export async function getInvitationLocale(invitationId: string): Promise<string | null> {
  const rows = await db
    .select({ locale: surveyInvitations.locale })
    .from(surveyInvitations)
    .where(eq(surveyInvitations.invitationId, invitationId))
    .limit(1);
  return rows[0]?.locale ?? null;
}

// ---------------------------------------------------------------------------------------------
// Writes: study definition
// ---------------------------------------------------------------------------------------------

async function resolveCohortVersions(cohorts: StudyCohortInput[]) {
  const seen = new Set<string>();
  const resolved: Array<{ cohortKey: string; surveyVersionId: string }> = [];
  for (const cohort of cohorts) {
    if (!(SURVEY_COHORT_KEYS as readonly string[]).includes(cohort.cohortKey)) {
      throw new SurveyAdminError(
        'invalid_cohort_key',
        `Unknown cohort key ${cohort.cohortKey}`,
        400,
      );
    }
    if (seen.has(cohort.cohortKey)) {
      throw new SurveyAdminError(
        'duplicate_cohort',
        `Cohort ${cohort.cohortKey} listed twice`,
        400,
      );
    }
    seen.add(cohort.cohortKey);
    const version = await getPublishedSurveyVersion(cohort.surveyId, cohort.version);
    if (!version) {
      throw new SurveyAdminError(
        'survey_version_not_found',
        `Survey ${cohort.surveyId} version ${cohort.version} is not published`,
        400,
      );
    }
    resolved.push({ cohortKey: cohort.cohortKey, surveyVersionId: version.surveyVersionId });
  }
  return resolved;
}

function assertWindow(opensAt?: Date | null, closesAt?: Date | null) {
  if (opensAt && closesAt && closesAt.getTime() <= opensAt.getTime()) {
    throw new SurveyAdminError('invalid_window', 'closesAt must be after opensAt', 400);
  }
}

function isUniqueViolation(error: unknown): boolean {
  const err = (error ?? {}) as { code?: string; cause?: { code?: string } };
  return err.code === '23505' || err.cause?.code === '23505';
}

export async function createStudy(input: CreateStudyInput, actorEmail: string) {
  assertWindow(input.opensAt, input.closesAt);
  const resolved = await resolveCohortVersions(input.cohorts);
  let studyId: string;
  try {
    studyId = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(surveyStudies)
        .values({
          studyKey: input.studyKey,
          title: input.title,
          opensAt: input.opensAt ?? null,
          closesAt: input.closesAt ?? null,
          holdoutPercent: input.holdoutPercent,
          rewardPolicy: input.rewardPolicy ?? null,
          createdBy: actorEmail,
        })
        .returning({ studyId: surveyStudies.studyId });
      const id = inserted[0].studyId;
      if (resolved.length > 0) {
        await tx
          .insert(surveyStudyCohorts)
          .values(resolved.map((cohort) => ({ studyId: id, ...cohort })));
      }
      return id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new SurveyAdminError('study_key_conflict', 'A study with this key already exists', 409);
    }
    throw error;
  }
  return getStudy(studyId);
}

export async function updateStudy(studyId: string, patch: UpdateStudyInput) {
  const existing = await requireStudy(db, studyId);
  if (existing.status !== 'draft') {
    throw new SurveyAdminError('study_not_draft', 'Only draft studies can be updated', 409);
  }
  const opensAt = patch.opensAt !== undefined ? patch.opensAt : existing.opensAt;
  const closesAt = patch.closesAt !== undefined ? patch.closesAt : existing.closesAt;
  assertWindow(opensAt, closesAt);
  const resolved = patch.cohorts ? await resolveCohortVersions(patch.cohorts) : null;

  const values: Partial<typeof surveyStudies.$inferInsert> = { updatedAt: new Date() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.opensAt !== undefined) values.opensAt = patch.opensAt;
  if (patch.closesAt !== undefined) values.closesAt = patch.closesAt;
  if (patch.holdoutPercent !== undefined) values.holdoutPercent = patch.holdoutPercent;
  if (patch.rewardPolicy !== undefined) values.rewardPolicy = patch.rewardPolicy;

  await db.transaction(async (tx) => {
    // The status guard in the WHERE clause makes a concurrent activation win cleanly.
    const updated = await tx
      .update(surveyStudies)
      .set(values)
      .where(and(eq(surveyStudies.studyId, studyId), eq(surveyStudies.status, 'draft')))
      .returning({ studyId: surveyStudies.studyId });
    if (updated.length === 0) {
      throw new SurveyAdminError('study_not_draft', 'Only draft studies can be updated', 409);
    }
    if (resolved) {
      const keep = resolved.map((cohort) => cohort.cohortKey);
      // Cohorts dropped from the list are removed; kept ones retain their linked campaigns.
      await tx
        .delete(surveyStudyCohorts)
        .where(
          keep.length > 0
            ? and(
                eq(surveyStudyCohorts.studyId, studyId),
                notInArray(surveyStudyCohorts.cohortKey, keep),
              )
            : eq(surveyStudyCohorts.studyId, studyId),
        );
      for (const cohort of resolved) {
        await tx
          .insert(surveyStudyCohorts)
          .values({ studyId, ...cohort })
          .onConflictDoUpdate({
            target: [surveyStudyCohorts.studyId, surveyStudyCohorts.cohortKey],
            set: { surveyVersionId: cohort.surveyVersionId },
          });
      }
    }
  });
  return getStudy(studyId);
}

const ALLOWED_TRANSITIONS: Record<SurveyStudyStatus, SurveyStudyStatus[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: ['archived'],
  archived: [],
};

export function canTransitionStudy(from: SurveyStudyStatus, to: SurveyStudyStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * A reward-eligible survey promises a gift, so the study must carry a usable reward policy
 * (types and a redemption deadline that has not passed) before respondents are invited.
 */
async function assertRewardPolicyForActivation(
  executor: Executor,
  study: SurveyStudy,
  cohorts: StudyCohortView[],
): Promise<void> {
  const versionIds = cohorts.map((cohort) => cohort.surveyVersionId).filter(Boolean);
  if (versionIds.length === 0) return;
  const versions = await executor
    .select({ definition: surveyVersions.definition })
    .from(surveyVersions)
    .where(inArray(surveyVersions.surveyVersionId, versionIds));
  const rewardEligible = versions.some(
    (version) =>
      (version.definition as { rewardEligible?: unknown } | null)?.rewardEligible === true,
  );
  if (!rewardEligible) return;

  const policy = study.rewardPolicy as {
    rewardTypes?: unknown;
    redemptionDeadline?: unknown;
  } | null;
  const deadline =
    typeof policy?.redemptionDeadline === 'string' ? new Date(policy.redemptionDeadline) : null;
  const validDeadline = deadline !== null && !Number.isNaN(deadline.getTime());
  const hasTypes = Array.isArray(policy?.rewardTypes) && policy.rewardTypes.length > 0;
  if (!policy || !hasTypes || !validDeadline || deadline.getTime() < Date.now()) {
    throw new SurveyAdminError(
      'reward_policy_required',
      'A reward-eligible survey needs a reward policy with reward types and a redemption deadline that has not passed before the study can be activated',
      409,
    );
  }
}

export async function setStudyStatus(studyId: string, status: SurveyStudyStatus) {
  const study = await requireStudy(db, studyId);
  if (!canTransitionStudy(study.status, status)) {
    throw new SurveyAdminError(
      'invalid_transition',
      `Cannot change a ${study.status} study to ${status}`,
      409,
    );
  }
  if (status === 'active') {
    const cohorts = await loadCohorts(db, [studyId]);
    if (cohorts.length === 0 || !study.closesAt) {
      throw new SurveyAdminError(
        'study_incomplete',
        'A study needs at least one cohort and a closing date before it can be activated',
        409,
      );
    }
    await assertRewardPolicyForActivation(db, study, cohorts);
  }
  const updated = await db
    .update(surveyStudies)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(surveyStudies.studyId, studyId), eq(surveyStudies.status, study.status)))
    .returning({ studyId: surveyStudies.studyId });
  if (updated.length === 0) {
    throw new SurveyAdminError('invalid_transition', 'Study status changed concurrently', 409);
  }
  return getStudy(studyId);
}

export async function linkCampaigns(input: {
  studyId: string;
  cohortKey: string;
  inviteCampaignId?: string | null;
  reminderCampaignId?: string | null;
}) {
  const values: Partial<typeof surveyStudyCohorts.$inferInsert> = {};
  if (input.inviteCampaignId !== undefined) values.inviteCampaignId = input.inviteCampaignId;
  if (input.reminderCampaignId !== undefined) values.reminderCampaignId = input.reminderCampaignId;
  if (Object.keys(values).length === 0) {
    throw new SurveyAdminError(
      'invalid_input',
      'inviteCampaignId or reminderCampaignId is required',
      400,
    );
  }
  const study = await requireStudy(db, input.studyId);
  if (study.status === 'archived') {
    throw new SurveyAdminError('study_archived', 'Archived studies cannot be changed', 409);
  }
  const updated = await db
    .update(surveyStudyCohorts)
    .set(values)
    .where(
      and(
        eq(surveyStudyCohorts.studyId, input.studyId),
        eq(surveyStudyCohorts.cohortKey, input.cohortKey),
      ),
    )
    .returning({ studyCohortId: surveyStudyCohorts.studyCohortId });
  if (updated.length === 0) {
    throw new SurveyAdminError('cohort_not_found', 'Cohort not found in this study', 404);
  }
  const cohorts = await loadCohorts(db, [input.studyId]);
  return cohorts.find((cohort) => cohort.cohortKey === input.cohortKey) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Audience: preview and snapshot
//
// Both use raw SQL. The audience is a population-wide aggregate (authors x published stories x paid
// orders x invitations) that must be classified, counted and inserted atomically in the database;
// pulling authors into Node would be slow and could not guarantee that preview and snapshot
// classify identically. The rules mirror `classifyAuthor` in src/lib/surveys/cohorts.ts.
// ---------------------------------------------------------------------------------------------

function normalizePreferences(preferences?: readonly string[]): string[] {
  const requested = preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  return [
    ...new Set(
      requested.filter((value) =>
        (KNOWN_NOTIFICATION_PREFERENCES as readonly string[]).includes(value),
      ),
    ),
  ];
}

function sqlList(values: readonly string[]): SQL {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

/** Email eligibility for authors alias `a` (the notification-engine re-checks at send time). */
function emailEligibleExpr(preferences: string[]): SQL {
  if (preferences.length === 0) return sql`false`;
  return sql`(a.email_status::text not in ('unsub', 'hard_bounce') and a.notification_preference::text in (${sqlList(preferences)}))`;
}

/** Classification CTEs shared by preview and snapshot (final CTE name: `classified`). */
function classifiedAuthorsCte(preferences: string[]): SQL {
  return sql`
    published as (
      select author_id, count(*)::int as n from stories where status = 'published' group by author_id
    ),
    paid as (
      select distinct author_id from payment_orders where status = 'completed' and amount > 0
    ),
    used_service as (
      select distinct author_id from credit_ledger
      where amount < 0
        and credit_event_type::text in ('eBookGeneration', 'audioBookGeneration', 'printOrder', 'selfPrinting', 'textEdit', 'imageEdit')
    ),
    started as (
      select distinct author_id from stories where status::text in ('draft', 'writing')
    ),
    classified as (
      select
        a.author_id,
        a.preferred_locale,
        coalesce(p.n, 0) as published_story_count,
        (pd.author_id is not null) as has_paid_purchase,
        (us.author_id is not null) as used_paid_service,
        (st.author_id is not null) as started_story,
        ${emailEligibleExpr(preferences)} as email_eligible,
        case
          when pd.author_id is not null and coalesce(p.n, 0) >= 1 then 'C3'
          when pd.author_id is not null then 'U2'
          when coalesce(p.n, 0) = 0 then 'C1'
          when coalesce(p.n, 0) = 1 then 'C2'
          else 'U1'
        end as cohort_key
      from authors a
      left join published p on p.author_id = a.author_id
      left join paid pd on pd.author_id = a.author_id
      left join used_service us on us.author_id = a.author_id
      left join started st on st.author_id = a.author_id
      where a.account_closed_at is null
    )`;
}

export interface AudiencePreview {
  totalAuthors: number;
  closedAccounts: number;
  cohorts: Record<
    SurveyCohortKey,
    { classified: number; emailEligible: number; suppressed: number; alreadyInvited: number }
  >;
  unclassified: { U1: number; U2: number };
  duplicateEmails: number;
  reconciles: boolean;
}

interface PreviewRow extends Record<string, unknown> {
  bucket: string;
  classified: number | string;
  email_eligible: number | string;
  already_invited: number | string;
}

export async function previewAudience(
  studyId: string,
  notificationPreferences?: readonly string[],
): Promise<AudiencePreview> {
  await requireStudy(db, studyId);
  const preferences = normalizePreferences(notificationPreferences);

  const result = await db.execute<PreviewRow>(sql`
    with ${classifiedAuthorsCte(preferences)},
    invited as (
      select author_id from survey_invitations where study_id = ${studyId}::uuid
    ),
    per_class as (
      select
        c.cohort_key as bucket,
        count(*) as classified,
        count(*) filter (where c.email_eligible) as email_eligible,
        count(*) filter (where i.author_id is not null) as already_invited
      from classified c
      left join invited i on i.author_id = c.author_id
      group by c.cohort_key
    ),
    duplicates as (
      select count(*) as n from (
        select lower(trim(email)) from authors where account_closed_at is null
        group by lower(trim(email)) having count(*) > 1
      ) d
    )
    select bucket, classified, email_eligible, already_invited from per_class
    union all select 'ACTIVE', count(*), 0, 0 from authors where account_closed_at is null
    union all select 'CLOSED', count(*), 0, 0 from authors where account_closed_at is not null
    union all select 'DUPLICATES', n, 0, 0 from duplicates
  `);

  const byBucket = new Map<string, PreviewRow>();
  for (const row of result.rows) byBucket.set(row.bucket, row);
  const num = (bucket: string, field: 'classified' | 'email_eligible' | 'already_invited') =>
    Number(byBucket.get(bucket)?.[field] ?? 0);

  const cohorts = {} as AudiencePreview['cohorts'];
  for (const key of SURVEY_COHORT_KEYS) {
    const classified = num(key, 'classified');
    const emailEligible = num(key, 'email_eligible');
    cohorts[key] = {
      classified,
      emailEligible,
      suppressed: classified - emailEligible,
      alreadyInvited: num(key, 'already_invited'),
    };
  }
  const unclassified = { U1: num('U1', 'classified'), U2: num('U2', 'classified') };
  const active = num('ACTIVE', 'classified');
  const closedAccounts = num('CLOSED', 'classified');
  const classifiedTotal =
    cohorts.C1.classified +
    cohorts.C2.classified +
    cohorts.C3.classified +
    unclassified.U1 +
    unclassified.U2;

  return {
    totalAuthors: active + closedAccounts,
    closedAccounts,
    cohorts,
    unclassified,
    duplicateEmails: num('DUPLICATES', 'classified'),
    reconciles: classifiedTotal === active,
  };
}

export interface SnapshotResult {
  dryRun: boolean;
  /** Invitation rows created per cohort (holdout rows included). On a dry run: rows that would be created. */
  inserted: Record<SurveyCohortKey, number>;
  /** Subset of `inserted` that are holdout (comparison) invitations, never emailed. */
  holdout: Record<SurveyCohortKey, number>;
  /** Eligible authors that already had an invitation in this study (left untouched). */
  skippedExisting: number;
}

interface SnapshotRow extends Record<string, unknown> {
  cohort_key: string | null;
  is_holdout: boolean | null;
  n: number | string;
  existing: number | string;
}

/** SQL CASE mirroring `normalizeLocale` (aliases live in src/lib/surveys/locales.ts). */
function localeCaseExpr(column: SQL): SQL {
  const normalized = sql`lower(replace(coalesce(${column}, ''), '_', '-'))`;
  const branches = SUPPORTED_LOCALES_CANONICAL.map(
    ({ locale, aliases }) => sql`when ${normalized} in (${sqlList(aliases)}) then ${locale}::text`,
  );
  return sql`case ${sql.join(branches, sql` `)} else 'en-US' end`;
}

export async function snapshotAudience(
  rawStudyId: string,
  cohortKeys: readonly string[],
  notificationPreferences?: readonly string[],
  dryRun = false,
): Promise<SnapshotResult> {
  // The holdout hash input is the canonical (lowercase) uuid text, as Postgres renders it.
  const studyId = rawStudyId.toLowerCase();
  const keys = [...new Set(cohortKeys)];
  if (keys.length === 0) {
    throw new SurveyAdminError('invalid_input', 'At least one cohort key is required', 400);
  }
  const preferences = normalizePreferences(notificationPreferences);

  return db.transaction(async (tx) => {
    // Lock the study row so a status change cannot interleave with the snapshot.
    const locked = await tx
      .select()
      .from(surveyStudies)
      .where(eq(surveyStudies.studyId, studyId))
      .limit(1)
      .for('update');
    const study = locked[0];
    if (!study) throw new SurveyAdminError('study_not_found', 'Study not found', 404);
    if (study.status !== 'draft' && study.status !== 'active') {
      throw new SurveyAdminError(
        'study_not_snapshottable',
        'Audiences can only be snapshotted for draft or active studies',
        409,
      );
    }
    const studyCohorts = await tx
      .select({ cohortKey: surveyStudyCohorts.cohortKey })
      .from(surveyStudyCohorts)
      .where(eq(surveyStudyCohorts.studyId, studyId));
    const configured = new Set(studyCohorts.map((cohort) => cohort.cohortKey));
    for (const key of keys) {
      if (!(SURVEY_COHORT_KEYS as readonly string[]).includes(key) || !configured.has(key)) {
        throw new SurveyAdminError(
          'cohort_not_found',
          `Cohort ${key} is not configured for this study`,
          400,
        );
      }
    }

    const snapshotAt = new Date().toISOString();
    // Deterministic holdout: same formula as `isHoldout` in src/lib/surveys/cohorts.ts.
    const holdoutExpr = sql`((('x' || substr(encode(sha256(convert_to(${studyId}::uuid::text || c.author_id::text, 'UTF8')), 'hex'), 1, 8))::bit(32)::bigint) % 100) < ${study.holdoutPercent}::int`;

    const candidates = sql`
      candidates as (
        select
          c.author_id,
          c.cohort_key,
          sc.survey_version_id,
          ${localeCaseExpr(sql`c.preferred_locale`)} as locale,
          ${holdoutExpr} as is_holdout,
          jsonb_build_object(
            'publishedStoryCount', c.published_story_count,
            'hasPaidPurchase', c.has_paid_purchase,
            'usedPaidService', c.used_paid_service,
            'startedStory', c.started_story,
            'snapshotAt', ${snapshotAt}::text
          ) as cohort_snapshot,
          exists (
            select 1 from survey_invitations i
            where i.study_id = ${studyId}::uuid and i.author_id = c.author_id
          ) as already_invited
        from classified c
        join survey_study_cohorts sc
          on sc.study_id = ${studyId}::uuid and sc.cohort_key = c.cohort_key
        where c.cohort_key in (${sqlList(keys)}) and c.email_eligible
      )`;

    let rows: SnapshotRow[];
    if (dryRun) {
      const result = await tx.execute<SnapshotRow>(sql`
        with ${classifiedAuthorsCte(preferences)}, ${candidates}
        select cohort_key, is_holdout,
               count(*) filter (where not already_invited) as n,
               count(*) filter (where already_invited) as existing
        from candidates group by cohort_key, is_holdout
      `);
      rows = result.rows;
    } else {
      const result = await tx.execute<SnapshotRow>(sql`
        with ${classifiedAuthorsCte(preferences)}, ${candidates},
        existing as (select count(*) as n from candidates where already_invited),
        inserted as (
          insert into survey_invitations
            (study_id, cohort_key, survey_version_id, author_id, locale, is_holdout, cohort_snapshot)
          select ${studyId}::uuid, cohort_key, survey_version_id, author_id, locale, is_holdout, cohort_snapshot
          from candidates
          on conflict (study_id, author_id) do nothing
          returning cohort_key, is_holdout
        )
        select cohort_key, is_holdout, count(*) as n, (select n from existing) as existing
        from inserted group by cohort_key, is_holdout
        union all
        select null, null, 0, (select n from existing) where not exists (select 1 from inserted)
      `);
      rows = result.rows;
      await tx
        .update(surveyStudies)
        .set({ snapshotAt: new Date(snapshotAt), updatedAt: new Date() })
        .where(eq(surveyStudies.studyId, studyId));
    }

    const inserted = { C1: 0, C2: 0, C3: 0 } as Record<SurveyCohortKey, number>;
    const holdout = { C1: 0, C2: 0, C3: 0 } as Record<SurveyCohortKey, number>;
    // Dry run reports `existing` per group (sum); the apply query repeats the global value (max).
    let skippedExisting = 0;
    for (const row of rows) {
      const existing = Number(row.existing ?? 0);
      skippedExisting = dryRun ? skippedExisting + existing : Math.max(skippedExisting, existing);
      if (!row.cohort_key) continue;
      const key = row.cohort_key as SurveyCohortKey;
      const count = Number(row.n);
      inserted[key] += count;
      if (row.is_holdout) holdout[key] += count;
    }
    return { dryRun, inserted, holdout, skippedExisting };
  });
}

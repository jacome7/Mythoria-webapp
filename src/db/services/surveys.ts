import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { surveys, surveyVersions, type SurveyVersion } from '@/db/schema/surveys';
import { hashSurveyDefinition } from '@/lib/surveys/definition-hash';
import { SURVEY_SOURCE_LOCALE, type SurveyDefinition } from '@/lib/surveys/definition-schema';
import { assertValidSurveyDefinition } from '@/lib/surveys/validate-definition';

type SurveyTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = SurveyTransaction | typeof db;

export type SurveyPublishAction = 'created' | 'unchanged' | 'conflict';

export interface SurveyPublishReportEntry {
  surveyId: string;
  version: number;
  action: SurveyPublishAction;
}

export interface PublishedSurveyVersion extends Omit<SurveyVersion, 'definition'> {
  definition: SurveyDefinition;
}

function toPublished(row: SurveyVersion): PublishedSurveyVersion {
  // Definitions are validated before they are published, so the stored JSON is trusted here.
  return { ...row, definition: row.definition as unknown as SurveyDefinition };
}

async function findVersion(executor: Executor, surveyId: string, version: number) {
  const rows = await executor
    .select()
    .from(surveyVersions)
    .where(and(eq(surveyVersions.surveyId, surveyId), eq(surveyVersions.version, version)))
    .limit(1);
  return rows[0] as SurveyVersion | undefined;
}

export async function getPublishedSurveyVersion(
  surveyId: string,
  version: number,
): Promise<PublishedSurveyVersion | null> {
  const row = await findVersion(db, surveyId, version);
  return row ? toPublished(row) : null;
}

export async function getCurrentSurveyVersion(
  surveyId: string,
): Promise<PublishedSurveyVersion | null> {
  const surveyRows = await db
    .select({ currentVersion: surveys.currentVersion })
    .from(surveys)
    .where(eq(surveys.surveyId, surveyId))
    .limit(1);
  const currentVersion = surveyRows[0]?.currentVersion;
  if (currentVersion == null) return null;
  return getPublishedSurveyVersion(surveyId, currentVersion);
}

async function runPublication(
  executor: Executor,
  definitions: SurveyDefinition[],
  dryRun: boolean,
): Promise<SurveyPublishReportEntry[]> {
  const seen = new Set<string>();
  const plan: Array<{
    definition: SurveyDefinition;
    hash: string;
    entry: SurveyPublishReportEntry;
  }> = [];

  for (const definition of definitions) {
    const key = `${definition.id}@${definition.version}`;
    if (seen.has(key)) {
      throw new Error(`Survey ${definition.id} version ${definition.version} is listed twice`);
    }
    seen.add(key);

    const hash = hashSurveyDefinition(definition);
    const existing = await findVersion(executor, definition.id, definition.version);
    const action: SurveyPublishAction = !existing
      ? 'created'
      : existing.definitionHash === hash
        ? 'unchanged'
        : 'conflict';
    plan.push({
      definition,
      hash,
      entry: { surveyId: definition.id, version: definition.version, action },
    });
  }

  const conflicts = plan.filter((item) => item.entry.action === 'conflict');
  if (conflicts.length > 0 && !dryRun) {
    throw new Error(
      conflicts
        .map(
          ({ entry }) =>
            `Version ${entry.version} of ${entry.surveyId} is already published with different content; create version ${entry.version + 1}`,
        )
        .join('\n'),
    );
  }

  if (!dryRun) {
    for (const { definition, hash, entry } of plan) {
      await executor
        .insert(surveys)
        .values({
          surveyId: definition.id,
          title: definition.title[SURVEY_SOURCE_LOCALE],
          purpose: definition.purpose,
          internalOnly: definition.internalOnly,
        })
        .onConflictDoUpdate({
          target: surveys.surveyId,
          set: {
            title: definition.title[SURVEY_SOURCE_LOCALE],
            purpose: definition.purpose,
            internalOnly: definition.internalOnly,
            updatedAt: sql`now()`,
          },
        });

      if (entry.action !== 'created') continue;

      await executor.insert(surveyVersions).values({
        surveyId: definition.id,
        version: definition.version,
        schemaVersion: definition.schemaVersion,
        definition,
        definitionHash: hash,
      });
      await executor
        .update(surveys)
        .set({
          currentVersion: sql`GREATEST(COALESCE(${surveys.currentVersion}, 0), ${definition.version})`,
          updatedAt: sql`now()`,
        })
        .where(eq(surveys.surveyId, definition.id));
    }
  }

  return plan.map((item) => item.entry);
}

/**
 * Validates and publishes code-defined survey versions. Published versions are immutable:
 * re-publishing identical content is a no-op, changed content under an existing version
 * number is rejected. With `dryRun` nothing is written and conflicts are reported instead
 * of thrown.
 */
export async function publishSurveyDefinitions(
  definitions: unknown[],
  opts: { dryRun: boolean },
): Promise<SurveyPublishReportEntry[]> {
  const validated = definitions.map((definition) => assertValidSurveyDefinition(definition));
  if (opts.dryRun) return runPublication(db, validated, true);
  return db.transaction((tx) => runPublication(tx, validated, false));
}

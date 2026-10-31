/**
 * Publishes code-defined survey versions (src/surveys/definitions) to the `survey_versions` table.
 *
 *   npm run surveys:validate   -> validate definitions only (no database access)
 *   npm run surveys:publish    -> dry run: validate and diff against the database (read-only)
 *   npm run surveys:publish -- --apply   -> write new versions (the ONLY mode that writes)
 *
 * The development database is shared with production: review the dry-run report before --apply.
 */
import { config } from 'dotenv';
import { SURVEY_DEFINITIONS } from '../src/surveys/definitions';
import { validateSurveyDefinition } from '../src/lib/surveys/validate-definition';
import type { SurveyDefinition } from '../src/lib/surveys/definition-schema';

config({ path: '.env.local', quiet: true });

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has('--apply');
  const validateOnly = args.has('--validate-only');

  const validated: SurveyDefinition[] = [];
  let invalid = 0;
  for (const input of SURVEY_DEFINITIONS) {
    const result = validateSurveyDefinition(input);
    const label = `${(input as { id?: string }).id}@v${(input as { version?: number }).version}`;
    if (result.ok) {
      validated.push(result.definition);
      console.log(`ok       ${label}`);
    } else {
      invalid += 1;
      console.error(`invalid  ${label}`);
      for (const error of result.errors) console.error(`  - ${error}`);
    }
  }

  if (invalid > 0) {
    console.error(`\n${invalid} survey definition(s) failed validation.`);
    process.exitCode = 1;
    return;
  }
  console.log(`\n${validated.length} survey definition(s) valid.`);
  if (validateOnly) return;

  // Imported lazily so --validate-only never touches the database module.
  const { publishSurveyDefinitions } = await import('../src/db/services/surveys');
  const report = await publishSurveyDefinitions(validated, { dryRun: !apply });

  console.log(
    apply ? '\nPublish report (applied):' : '\nPublish report (dry run, nothing written):',
  );
  for (const entry of report) {
    console.log(`${entry.action.padEnd(10)} ${entry.surveyId}@v${entry.version}`);
  }
  if (report.some((entry) => entry.action === 'conflict')) {
    console.error(
      '\nConflicts found: a published version cannot change. Create a new version file instead.',
    );
    process.exitCode = 1;
  } else if (!apply) {
    console.log('\nRe-run with --apply to write the changes above.');
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    // The pg pool (when opened) keeps the event loop alive.
    process.exit(process.exitCode ?? 0);
  });

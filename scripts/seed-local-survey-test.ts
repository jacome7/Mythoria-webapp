/**
 * Creates (or removes) a throw-away survey study with ONE invitation for ONE existing author, so a
 * survey can be exercised end-to-end on a developer machine.
 *
 *   npm run surveys:local-test -- --email you@example.com [--survey demo_all_controls] [--locale en-US]
 *       [--version N] [--stories N] [--used-paid-service yes|no] [--started yes|no|unknown] [--reset]
 *       -> dry run: shows what would be created (read-only)
 *   npm run surveys:local-test -- --email you@example.com --apply
 *       -> creates the study `local-test-<survey>` + your invitation and prints the survey URL
 *   npm run surveys:local-test -- --email you@example.com --survey demo_all_controls --cleanup --apply
 *       -> deletes everything created above (responses, answers, reward entitlement, invitation, study)
 *
 * The development database is shared with production. Only the named author and a clearly
 * labelled `local-test-*` study are touched; no email is sent and no campaign is created.
 * A reward redeemed during the test starts a real generation (see docs/SURVEYS.md).
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });

const COHORT_BY_SURVEY: Record<string, string> = {
  demo_all_controls: 'C1',
  activation_no_story: 'C1',
  free_creator_no_purchase: 'C2',
  paying_creator: 'C3',
};
const LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'];
const DAY_MS = 24 * 60 * 60 * 1000;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const cleanup = process.argv.includes('--cleanup');
  const reset = process.argv.includes('--reset');
  const email = option('email')?.trim().toLowerCase();
  const surveyId = option('survey') ?? 'demo_all_controls';
  const requestedLocale = option('locale');
  const requestedVersion = option('version') ? Number(option('version')) : undefined;
  // Facts that normally come from the audience snapshot; they drive audience-restricted questions.
  const storyCount = Number(option('stories') ?? (surveyId === 'paying_creator' ? 1 : 0));
  const usedPaidService = (option('used-paid-service') ?? 'yes') !== 'no';
  // yes | no | unknown (unknown omits the fact, as an older snapshot would).
  const started = option('started') ?? 'no';

  if (!email) throw new Error('--email <your author email> is required');
  const cohortKey = COHORT_BY_SURVEY[surveyId];
  if (!cohortKey) {
    throw new Error(`--survey must be one of: ${Object.keys(COHORT_BY_SURVEY).join(', ')}`);
  }
  if (requestedLocale && !LOCALES.includes(requestedLocale)) {
    throw new Error(`--locale must be one of: ${LOCALES.join(', ')}`);
  }
  const studyKey = `local-test-${surveyId}`.replace(/_/g, '-');

  const { and, desc, eq } = await import('drizzle-orm');
  const { db } = await import('../src/db');
  const { authors } = await import('../src/db/schema/authors');
  const { surveys, surveyVersions, surveyStudies, surveyStudyCohorts, surveyInvitations } =
    await import('../src/db/schema/surveys');
  const { createSurveyToken } = await import('../src/lib/surveys/tokens');

  const [author] = await db
    .select({ authorId: authors.authorId, preferredLocale: authors.preferredLocale })
    .from(authors)
    .where(eq(authors.email, email))
    .limit(1);
  if (!author) throw new Error(`No author found with email ${email}`);

  const [existingStudy] = await db
    .select({ studyId: surveyStudies.studyId })
    .from(surveyStudies)
    .where(eq(surveyStudies.studyKey, studyKey))
    .limit(1);

  if (cleanup) {
    if (!existingStudy) {
      console.log(`Nothing to clean up: study ${studyKey} does not exist.`);
      return;
    }
    console.log(`Would delete study ${studyKey} with all its invitations and responses.`);
    if (!apply) return console.log('Re-run with --apply to delete.');
    // Invitations are `restrict` on the study; their responses/answers/entitlements cascade.
    await db.delete(surveyInvitations).where(eq(surveyInvitations.studyId, existingStudy.studyId));
    await db.delete(surveyStudies).where(eq(surveyStudies.studyId, existingStudy.studyId));
    console.log('Deleted.');
    return;
  }

  const [version] = await db
    .select({ surveyVersionId: surveyVersions.surveyVersionId, version: surveyVersions.version })
    .from(surveyVersions)
    .innerJoin(surveys, eq(surveys.surveyId, surveyVersions.surveyId))
    .where(
      requestedVersion
        ? and(eq(surveyVersions.surveyId, surveyId), eq(surveyVersions.version, requestedVersion))
        : eq(surveyVersions.surveyId, surveyId),
    )
    .orderBy(desc(surveyVersions.version))
    .limit(1);
  if (!version) {
    throw new Error(
      `Survey ${surveyId}${requestedVersion ? `@v${requestedVersion}` : ''} is not published (run: npm run surveys:publish -- --apply).`,
    );
  }

  const locale =
    requestedLocale ?? LOCALES.find((l) => l.startsWith(author.preferredLocale ?? '')) ?? 'en-US';
  console.log(
    `Plan: study ${studyKey} (${surveyId}@v${version.version}, cohort ${cohortKey}), 1 invitation for ${email}, locale ${locale}`,
  );
  if (!apply) return console.log('Re-run with --apply to create it.');

  const now = Date.now();
  const studyId =
    existingStudy?.studyId ??
    (
      await db
        .insert(surveyStudies)
        .values({
          studyKey,
          title: `Local test (${surveyId})`,
          status: 'active',
          opensAt: new Date(now - DAY_MS),
          closesAt: new Date(now + 7 * DAY_MS),
          rewardPolicy: {
            rewardTypes: ['pdf', 'audiobook'],
            redemptionDeadline: new Date(now + 14 * DAY_MS).toISOString(),
            allowExistingAudiobook: false,
          },
          createdBy: 'local-test-script',
          snapshotAt: new Date(now),
        })
        .returning({ studyId: surveyStudies.studyId })
    )[0].studyId;

  await db
    .insert(surveyStudyCohorts)
    .values({ studyId, cohortKey, surveyVersionId: version.surveyVersionId })
    .onConflictDoUpdate({
      target: [surveyStudyCohorts.studyId, surveyStudyCohorts.cohortKey],
      set: { surveyVersionId: version.surveyVersionId },
    });

  // An invitation is pinned to one survey version. Re-testing a newer version (or --reset)
  // recreates the test invitation; its draft answers, responses and rewards cascade away.
  const [previous] = await db
    .select({
      invitationId: surveyInvitations.invitationId,
      surveyVersionId: surveyInvitations.surveyVersionId,
    })
    .from(surveyInvitations)
    .where(
      and(eq(surveyInvitations.studyId, studyId), eq(surveyInvitations.authorId, author.authorId)),
    )
    .limit(1);
  if (previous && (previous.surveyVersionId !== version.surveyVersionId || reset)) {
    console.log('Recreating the test invitation (previous draft answers are discarded).');
    await db
      .delete(surveyInvitations)
      .where(eq(surveyInvitations.invitationId, previous.invitationId));
  }

  await db
    .insert(surveyInvitations)
    .values({
      studyId,
      cohortKey,
      surveyVersionId: version.surveyVersionId,
      authorId: author.authorId,
      locale,
      cohortSnapshot: {
        publishedStoryCount: storyCount,
        hasPaidPurchase: cohortKey === 'C3',
        usedPaidService,
        ...(started === 'unknown' ? {} : { startedStory: started === 'yes' }),
        snapshotAt: new Date(now).toISOString(),
      },
    })
    .onConflictDoNothing();

  const [invitation] = await db
    .select({ invitationId: surveyInvitations.invitationId, status: surveyInvitations.status })
    .from(surveyInvitations)
    .where(
      and(eq(surveyInvitations.studyId, studyId), eq(surveyInvitations.authorId, author.authorId)),
    )
    .limit(1);

  const token = createSurveyToken(invitation.invitationId);
  console.log(`\nInvitation status: ${invitation.status}`);
  console.log(`Open: http://localhost:3000/${locale}/survey/${token}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });

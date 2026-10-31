import { NextResponse } from 'next/server';
import {
  listEntitlementsForAvailableEmail,
  reconcileRewards,
  unlockPendingStories,
} from '@/db/services/survey-rewards';
import { verifySchedulerRequest } from '@/lib/scheduler-auth';
import {
  sendAudiobookReadyEmails,
  sendFirstStoryUnlockedEmails,
  sendRewardAvailableEmails,
} from '@/lib/surveys/reward-emails';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cloud Scheduler job: unlock gifts waiting for a first published story, settle gifts being
 * produced, expire what is past its deadline and send the reward emails. Email failures are
 * logged by the senders and never fail the job.
 */
export async function POST(request: Request) {
  if (!(await verifySchedulerRequest(request, 'SURVEY_SCHEDULER_SERVICE_ACCOUNT'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const unlocked = await unlockPendingStories();
    const reconciled = await reconcileRewards();

    const unlockedSet = new Set(unlocked);
    const availableCandidates = (await listEntitlementsForAvailableEmail()).filter(
      (id) => !unlockedSet.has(id),
    );

    const [unlockedEmails, availableEmails, audiobookEmails] = await Promise.all([
      sendFirstStoryUnlockedEmails(unlocked),
      sendRewardAvailableEmails(availableCandidates),
      sendAudiobookReadyEmails(reconciled.delivered),
    ]);

    const summary = {
      unlocked: unlocked.length,
      delivered: reconciled.delivered.length,
      failed: reconciled.failed.length,
      expired: reconciled.expired.length,
      invitationsExpired: reconciled.invitationsExpired,
      emails: {
        available: availableEmails,
        unlocked: unlockedEmails,
        audiobookReady: audiobookEmails,
      },
    };
    console.info('[SurveyRewards] Reconcile job finished', summary);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('Survey reward reconcile job failed:', error);
    return NextResponse.json({ error: 'Reward reconcile failed' }, { status: 500 });
  }
}

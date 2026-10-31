import { and, desc, eq, exists, gt, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  authors,
  productGenerationRequests,
  stories,
  surveyInvitations,
  surveyRewardEntitlements,
  surveyStudies,
  type SurveyRewardEntitlement,
  type SurveyRewardType,
} from '@/db/schema';
import { compensateProductGeneration } from '@/lib/product-generation';

type SurveyRewardTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Entitlement states an author may still act on (choose / change / retry). */
export const OPEN_REWARD_STATUSES = ['eligible', 'selected', 'failed'] as const;
/** States that still hold an unredeemed gift and therefore expire at the deadline. */
const EXPIRABLE_REWARD_STATUSES = ['eligible', 'pending_story', 'selected', 'failed'] as const;
/** A pending request that never reached the queue is compensated after this long. */
const STUCK_PENDING_MS = 30 * 60 * 1000;
/** Rows touched by the unlock step differ from their creation time by more than this. */
const UNTOUCHED_TOLERANCE_MS = 1000;
const AVAILABLE_EMAIL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface RewardPolicy {
  rewardTypes: SurveyRewardType[];
  redemptionDeadline: string | null;
  allowExistingAudiobook: boolean;
}

export function parseRewardPolicy(raw: unknown): RewardPolicy {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const types = Array.isArray(source.rewardTypes)
    ? (source.rewardTypes.filter((t) => t === 'pdf' || t === 'audiobook') as SurveyRewardType[])
    : [];
  return {
    rewardTypes: types.length ? Array.from(new Set(types)) : ['pdf', 'audiobook'],
    redemptionDeadline:
      typeof source.redemptionDeadline === 'string' ? source.redemptionDeadline : null,
    allowExistingAudiobook: source.allowExistingAudiobook === true,
  };
}

export type SurveyRewardErrorCode =
  | 'not_found'
  | 'expired'
  | 'pending_story'
  | 'not_selectable'
  | 'already_redeemed'
  | 'reward_type_not_allowed'
  | 'story_not_found'
  | 'audiobook_exists';

export class SurveyRewardError extends Error {
  constructor(readonly code: SurveyRewardErrorCode) {
    super(code);
    this.name = 'SurveyRewardError';
  }
}

export interface RewardEntitlementView {
  entitlement: SurveyRewardEntitlement;
  policy: RewardPolicy;
  /** Locale the invitation (and so the survey) was sent in. */
  invitationLocale: string;
}

export async function getEntitlementForAuthor(
  entitlementId: string,
  authorId: string,
): Promise<RewardEntitlementView | null> {
  const [row] = await db
    .select({
      entitlement: surveyRewardEntitlements,
      rewardPolicy: surveyStudies.rewardPolicy,
      invitationLocale: surveyInvitations.locale,
    })
    .from(surveyRewardEntitlements)
    .innerJoin(
      surveyInvitations,
      eq(surveyInvitations.invitationId, surveyRewardEntitlements.invitationId),
    )
    .innerJoin(surveyStudies, eq(surveyStudies.studyId, surveyInvitations.studyId))
    .where(
      and(
        eq(surveyRewardEntitlements.entitlementId, entitlementId),
        eq(surveyRewardEntitlements.authorId, authorId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    entitlement: row.entitlement,
    policy: parseRewardPolicy(row.rewardPolicy),
    invitationLocale: row.invitationLocale,
  };
}

export interface EligibleStory {
  storyId: string;
  title: string;
  coverUri: string | null;
  hasAudiobook: boolean;
  audiobookGenerating: boolean;
  pdfAlreadyRedeemed: boolean;
}

export async function listEligibleStories(authorId: string): Promise<EligibleStory[]> {
  const rows = await db
    .select({
      storyId: stories.storyId,
      title: stories.title,
      coverUri: stories.coverUri,
      audiobookStatus: stories.audiobookStatus,
    })
    .from(stories)
    .where(and(eq(stories.authorId, authorId), eq(stories.status, 'published')))
    .orderBy(desc(stories.updatedAt))
    .limit(100);
  if (!rows.length) return [];

  const redeemedPdfs = await db
    .select({ storyId: productGenerationRequests.storyId })
    .from(productGenerationRequests)
    .where(
      and(
        eq(productGenerationRequests.authorId, authorId),
        eq(productGenerationRequests.actionType, 'self_print'),
        eq(productGenerationRequests.fundingSource, 'survey_reward'),
        inArray(productGenerationRequests.status, ['pending', 'queued', 'running', 'completed']),
      ),
    );
  const redeemed = new Set(redeemedPdfs.map((r) => r.storyId));

  return rows.map((row) => ({
    storyId: row.storyId,
    title: row.title,
    coverUri: row.coverUri,
    hasAudiobook: row.audiobookStatus === 'completed',
    audiobookGenerating: row.audiobookStatus === 'generating',
    pdfAlreadyRedeemed: redeemed.has(row.storyId),
  }));
}

/** Entitlements to show in the My Stories banner (open and not past their deadline). */
export async function listOpenEntitlementsForAuthor(
  authorId: string,
  now = new Date(),
): Promise<Array<Pick<SurveyRewardEntitlement, 'entitlementId' | 'status' | 'expiresAt'>>> {
  return db
    .select({
      entitlementId: surveyRewardEntitlements.entitlementId,
      status: surveyRewardEntitlements.status,
      expiresAt: surveyRewardEntitlements.expiresAt,
    })
    .from(surveyRewardEntitlements)
    .where(
      and(
        eq(surveyRewardEntitlements.authorId, authorId),
        inArray(surveyRewardEntitlements.status, [...OPEN_REWARD_STATUSES]),
        or(isNull(surveyRewardEntitlements.expiresAt), gt(surveyRewardEntitlements.expiresAt, now)),
      ),
    )
    .orderBy(desc(surveyRewardEntitlements.createdAt));
}

async function lockEntitlement(
  tx: SurveyRewardTransaction,
  entitlementId: string,
  authorId: string,
): Promise<SurveyRewardEntitlement | null> {
  const [entitlement] = await tx
    .select()
    .from(surveyRewardEntitlements)
    .where(
      and(
        eq(surveyRewardEntitlements.entitlementId, entitlementId),
        eq(surveyRewardEntitlements.authorId, authorId),
      ),
    )
    .for('update');
  return entitlement ?? null;
}

/**
 * Records the author's choice (reward type + story). Validates ownership, publication and the
 * study's reward policy; never starts production. Idempotent for an entitlement that is already
 * `processing` with the same choice.
 */
export async function selectReward(
  entitlementId: string,
  authorId: string,
  rewardType: SurveyRewardType,
  storyId: string,
): Promise<SurveyRewardEntitlement> {
  return db.transaction(async (tx) => {
    const entitlement = await lockEntitlement(tx, entitlementId, authorId);
    if (!entitlement) throw new SurveyRewardError('not_found');

    if (entitlement.status === 'processing') {
      if (entitlement.rewardType === rewardType && entitlement.storyId === storyId) {
        return entitlement;
      }
      throw new SurveyRewardError('already_redeemed');
    }
    if (entitlement.status === 'delivered') throw new SurveyRewardError('already_redeemed');
    if (entitlement.status === 'expired') throw new SurveyRewardError('expired');
    if (entitlement.status === 'pending_story') throw new SurveyRewardError('pending_story');
    if (!(OPEN_REWARD_STATUSES as readonly string[]).includes(entitlement.status)) {
      throw new SurveyRewardError('not_selectable');
    }
    if (entitlement.expiresAt && entitlement.expiresAt.getTime() <= Date.now()) {
      throw new SurveyRewardError('expired');
    }

    const [policyRow] = await tx
      .select({ rewardPolicy: surveyStudies.rewardPolicy })
      .from(surveyInvitations)
      .innerJoin(surveyStudies, eq(surveyStudies.studyId, surveyInvitations.studyId))
      .where(eq(surveyInvitations.invitationId, entitlement.invitationId))
      .limit(1);
    const policy = parseRewardPolicy(policyRow?.rewardPolicy);
    if (!policy.rewardTypes.includes(rewardType)) {
      throw new SurveyRewardError('reward_type_not_allowed');
    }

    const [story] = await tx
      .select({
        storyId: stories.storyId,
        status: stories.status,
        audiobookStatus: stories.audiobookStatus,
      })
      .from(stories)
      .where(and(eq(stories.storyId, storyId), eq(stories.authorId, authorId)))
      .limit(1);
    if (!story || story.status !== 'published') throw new SurveyRewardError('story_not_found');
    if (
      rewardType === 'audiobook' &&
      !policy.allowExistingAudiobook &&
      (story.audiobookStatus === 'completed' || story.audiobookStatus === 'generating')
    ) {
      throw new SurveyRewardError('audiobook_exists');
    }

    const now = new Date();
    const [updated] = await tx
      .update(surveyRewardEntitlements)
      .set({ rewardType, storyId, status: 'selected', selectedAt: now, updatedAt: now })
      .where(eq(surveyRewardEntitlements.entitlementId, entitlementId))
      .returning();
    if (!updated) throw new SurveyRewardError('not_found');
    return updated;
  });
}

/**
 * `pending_story` -> `eligible` for authors who have published a story since the survey.
 * Returns the unlocked entitlement ids.
 */
export async function unlockPendingStories(now = new Date()): Promise<string[]> {
  const rows = await db
    .update(surveyRewardEntitlements)
    .set({ status: 'eligible', updatedAt: now })
    .where(
      and(
        eq(surveyRewardEntitlements.status, 'pending_story'),
        or(isNull(surveyRewardEntitlements.expiresAt), gt(surveyRewardEntitlements.expiresAt, now)),
        exists(
          db
            .select({ one: sql`1` })
            .from(stories)
            .where(
              and(
                eq(stories.authorId, surveyRewardEntitlements.authorId),
                eq(stories.status, 'published'),
              ),
            ),
        ),
      ),
    )
    .returning({ entitlementId: surveyRewardEntitlements.entitlementId });
  return rows.map((row) => row.entitlementId);
}

export interface ReconcileRewardsResult {
  delivered: string[];
  failed: string[];
  expired: string[];
  invitationsExpired: number;
}

/**
 * Moves `processing` entitlements to `delivered` / `failed` from the linked production request,
 * expires unredeemed gifts past their deadline and expires open invitations of closed studies.
 */
export async function reconcileRewards(now = new Date()): Promise<ReconcileRewardsResult> {
  const result: ReconcileRewardsResult = {
    delivered: [],
    failed: [],
    expired: [],
    invitationsExpired: 0,
  };

  const processing = await db
    .select({
      entitlementId: surveyRewardEntitlements.entitlementId,
      rewardType: surveyRewardEntitlements.rewardType,
      productRunId: surveyRewardEntitlements.productRunId,
      storyId: surveyRewardEntitlements.storyId,
      requestRunId: productGenerationRequests.runId,
      requestStatus: productGenerationRequests.status,
      requestCreatedAt: productGenerationRequests.createdAt,
      failureStage: productGenerationRequests.failureStage,
      failureCode: productGenerationRequests.failureCode,
      audiobookStatus: stories.audiobookStatus,
    })
    .from(surveyRewardEntitlements)
    .leftJoin(
      productGenerationRequests,
      eq(productGenerationRequests.runId, surveyRewardEntitlements.productRunId),
    )
    .leftJoin(stories, eq(stories.storyId, surveyRewardEntitlements.storyId))
    .where(eq(surveyRewardEntitlements.status, 'processing'));

  for (const row of processing) {
    const markFailed = async (lastError: string) => {
      const updated = await db
        .update(surveyRewardEntitlements)
        .set({
          status: 'failed',
          failedAt: now,
          lastError: lastError.slice(0, 255),
          updatedAt: now,
        })
        .where(
          and(
            eq(surveyRewardEntitlements.entitlementId, row.entitlementId),
            eq(surveyRewardEntitlements.status, 'processing'),
          ),
        )
        .returning({ entitlementId: surveyRewardEntitlements.entitlementId });
      if (updated.length) result.failed.push(row.entitlementId);
    };
    const markDelivered = async () => {
      const updated = await db
        .update(surveyRewardEntitlements)
        .set({ status: 'delivered', deliveredAt: now, updatedAt: now })
        .where(
          and(
            eq(surveyRewardEntitlements.entitlementId, row.entitlementId),
            eq(surveyRewardEntitlements.status, 'processing'),
          ),
        )
        .returning({ entitlementId: surveyRewardEntitlements.entitlementId });
      if (updated.length) result.delivered.push(row.entitlementId);
    };

    if (!row.requestRunId || !row.requestStatus) {
      await markFailed('missing_run');
      continue;
    }
    if (row.requestStatus === 'completed') {
      await markDelivered();
      continue;
    }
    if (row.requestStatus === 'failed') {
      await markFailed(
        row.failureStage || row.failureCode
          ? `${row.failureStage ?? 'run'}:${row.failureCode ?? 'failed'}`
          : 'run_failed',
      );
      continue;
    }
    if (row.requestStatus === 'pending') {
      // The request was created but never handed to the workflow (process died in between).
      if (
        row.requestCreatedAt &&
        now.getTime() - row.requestCreatedAt.getTime() > STUCK_PENDING_MS
      ) {
        const compensated = await compensateProductGeneration(
          row.requestRunId,
          'reconcile',
          'stuck_pending',
        );
        // Already queued by a concurrent launcher: nothing to undo, nothing failed.
        if (compensated === false) continue;
        if (row.rewardType === 'audiobook' && row.storyId) {
          // The launcher flips the story to `generating` before publishing; a request that never
          // reached the queue would otherwise leave it stuck. Only reset when still `generating`
          // and no other production of this story is active.
          await db
            .update(stories)
            .set({ audiobookStatus: null })
            .where(
              and(
                eq(stories.storyId, row.storyId),
                eq(stories.audiobookStatus, 'generating'),
                sql`not exists (
                  select 1 from ${productGenerationRequests}
                  where ${productGenerationRequests.storyId} = ${row.storyId}
                    and ${productGenerationRequests.actionType} = 'audiobook_generation'
                    and ${productGenerationRequests.status} in ('pending', 'queued', 'running')
                )`,
              ),
            );
        }
        result.failed.push(row.entitlementId);
      }
      continue;
    }
    // queued / running: the story status is the faster signal for audiobooks.
    if (row.rewardType === 'audiobook') {
      if (row.audiobookStatus === 'completed') await markDelivered();
      else if (row.audiobookStatus === 'failed') await markFailed('audiobook_failed');
    }
  }

  const expired = await db
    .update(surveyRewardEntitlements)
    .set({ status: 'expired', updatedAt: now })
    .where(
      and(
        inArray(surveyRewardEntitlements.status, [...EXPIRABLE_REWARD_STATUSES]),
        lte(surveyRewardEntitlements.expiresAt, now),
      ),
    )
    .returning({ entitlementId: surveyRewardEntitlements.entitlementId });
  result.expired = expired.map((row) => row.entitlementId);

  const closedStudies = db
    .select({ studyId: surveyStudies.studyId })
    .from(surveyStudies)
    .where(
      or(
        inArray(surveyStudies.status, ['closed', 'archived']),
        and(sql`${surveyStudies.closesAt} is not null`, lte(surveyStudies.closesAt, now)),
      ),
    );
  const expiredInvitations = await db
    .update(surveyInvitations)
    .set({ status: 'expired', expiredAt: now, updatedAt: now })
    .where(
      and(
        inArray(surveyInvitations.status, ['not_started', 'opened', 'started']),
        inArray(surveyInvitations.studyId, closedStudies),
      ),
    )
    .returning({ invitationId: surveyInvitations.invitationId });
  result.invitationsExpired = expiredInvitations.length;

  return result;
}

export interface RewardEmailContext {
  entitlementId: string;
  authorId: string;
  email: string;
  displayName: string;
  /** Normalized author locale used for the email language and the links. */
  locale: string;
  expiresAt: Date | null;
  rewardType: SurveyRewardType | null;
  storyId: string | null;
  storyTitle: string | null;
}

/** Email context for entitlements; skips closed accounts and authors without a usable address. */
export async function getRewardEmailContexts(
  entitlementIds: string[],
): Promise<RewardEmailContext[]> {
  if (!entitlementIds.length) return [];
  const rows = await db
    .select({
      entitlementId: surveyRewardEntitlements.entitlementId,
      authorId: surveyRewardEntitlements.authorId,
      email: authors.email,
      displayName: authors.displayName,
      preferredLocale: authors.preferredLocale,
      invitationLocale: surveyInvitations.locale,
      expiresAt: surveyRewardEntitlements.expiresAt,
      rewardType: surveyRewardEntitlements.rewardType,
      storyId: surveyRewardEntitlements.storyId,
      storyTitle: stories.title,
      accountClosedAt: authors.accountClosedAt,
      emailStatus: authors.emailStatus,
    })
    .from(surveyRewardEntitlements)
    .innerJoin(authors, eq(authors.authorId, surveyRewardEntitlements.authorId))
    .innerJoin(
      surveyInvitations,
      eq(surveyInvitations.invitationId, surveyRewardEntitlements.invitationId),
    )
    .leftJoin(stories, eq(stories.storyId, surveyRewardEntitlements.storyId))
    .where(inArray(surveyRewardEntitlements.entitlementId, entitlementIds));

  return rows
    .filter((row) => !row.accountClosedAt && row.email && row.emailStatus !== 'hard_bounce')
    .map((row) => ({
      entitlementId: row.entitlementId,
      authorId: row.authorId,
      email: row.email,
      displayName: row.displayName,
      locale: row.preferredLocale || row.invitationLocale,
      expiresAt: row.expiresAt,
      rewardType: row.rewardType,
      storyId: row.storyId,
      storyTitle: row.storyTitle,
    }));
}

/**
 * Entitlements created `eligible` recently (never `pending_story`), candidates for the
 * "your gift is ready" email. The send itself is idempotent per entitlement.
 */
export async function listEntitlementsForAvailableEmail(now = new Date()): Promise<string[]> {
  const since = new Date(now.getTime() - AVAILABLE_EMAIL_WINDOW_MS);
  const rows = await db
    .select({
      entitlementId: surveyRewardEntitlements.entitlementId,
      createdAt: surveyRewardEntitlements.createdAt,
      updatedAt: surveyRewardEntitlements.updatedAt,
    })
    .from(surveyRewardEntitlements)
    .where(
      and(
        eq(surveyRewardEntitlements.status, 'eligible'),
        gt(surveyRewardEntitlements.createdAt, since),
        or(isNull(surveyRewardEntitlements.expiresAt), gt(surveyRewardEntitlements.expiresAt, now)),
      ),
    );
  // Rows that were `pending_story` and later unlocked get the "first story unlocked" email.
  return rows
    .filter((row) => row.updatedAt.getTime() - row.createdAt.getTime() <= UNTOUCHED_TOLERANCE_MS)
    .map((row) => row.entitlementId);
}

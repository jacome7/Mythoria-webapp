import { getRewardEmailContexts, type RewardEmailContext } from '@/db/services/survey-rewards';
import { notificationClient } from '@/lib/notifications/client';
import { normalizeLocale } from '@/utils/locale-utils';

/**
 * Reward emails (SURVEYS.md "Reward emails"). Each send is idempotent through the notification
 * engine `entityId` (sendOnce), and a failed send is logged and counted, never thrown, so the
 * reconcile job always finishes its state transitions.
 */

export interface RewardEmailSummary {
  sent: number;
  failed: number;
}

type RewardEmailKind = 'available' | 'unlocked' | 'audiobook-ready';

const TEMPLATES: Record<RewardEmailKind, { templateId: string; entityPrefix: string }> = {
  available: {
    templateId: 'survey-reward-available',
    entityPrefix: 'survey-reward-available',
  },
  unlocked: {
    templateId: 'survey-reward-first-story-unlocked',
    entityPrefix: 'survey-reward-unlocked',
  },
  'audiobook-ready': {
    templateId: 'survey-reward-audiobook-ready',
    entityPrefix: 'survey-reward-audio-ready',
  },
};

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt').replace(/\/+$/, '');
}

export function rewardLink(locale: string, entitlementId: string): string {
  return `${baseUrl()}/${normalizeLocale(locale)}/survey/reward/${entitlementId}`;
}

export function storyListenLink(locale: string, storyId: string): string {
  return `${baseUrl()}/${normalizeLocale(locale)}/stories/listen/${storyId}`;
}

function formatDeadline(date: Date | null, locale: string): string {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Lisbon' }).format(
      date,
    );
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function variablesFor(kind: RewardEmailKind, ctx: RewardEmailContext, locale: string) {
  if (kind === 'audiobook-ready') {
    return {
      name: ctx.displayName,
      storyTitle: ctx.storyTitle ?? '',
      listenLink: ctx.storyId ? storyListenLink(locale, ctx.storyId) : baseUrl(),
    };
  }
  return {
    name: ctx.displayName,
    rewardLink: rewardLink(locale, ctx.entitlementId),
    redemptionDeadline: formatDeadline(ctx.expiresAt, locale),
  };
}

async function sendRewardEmails(
  kind: RewardEmailKind,
  entitlementIds: string[],
): Promise<RewardEmailSummary> {
  const summary: RewardEmailSummary = { sent: 0, failed: 0 };
  if (!entitlementIds.length) return summary;

  let contexts: RewardEmailContext[];
  try {
    contexts = await getRewardEmailContexts(entitlementIds);
  } catch (error) {
    console.error('[SurveyRewards] Could not load email recipients', { kind, error });
    summary.failed = entitlementIds.length;
    return summary;
  }

  const { templateId, entityPrefix } = TEMPLATES[kind];
  for (const ctx of contexts) {
    if (kind === 'audiobook-ready' && (ctx.rewardType !== 'audiobook' || !ctx.storyId)) continue;
    const locale = normalizeLocale(ctx.locale);
    try {
      const response = await notificationClient.sendTemplatedEmail({
        templateId,
        recipients: [{ email: ctx.email, name: ctx.displayName, language: locale }],
        variables: variablesFor(kind, ctx, locale),
        authorId: ctx.authorId,
        entityId: `${entityPrefix}:${ctx.entitlementId}`,
        metadata: { notificationType: templateId },
      });
      if (response.success) summary.sent += 1;
      else {
        summary.failed += 1;
        console.error('[SurveyRewards] Reward email was not accepted', {
          templateId,
          entitlementId: ctx.entitlementId,
          error: response.error,
        });
      }
    } catch (error) {
      summary.failed += 1;
      console.error('[SurveyRewards] Reward email threw', {
        templateId,
        entitlementId: ctx.entitlementId,
        error,
      });
    }
  }
  return summary;
}

export const sendRewardAvailableEmails = (ids: string[]) => sendRewardEmails('available', ids);
export const sendFirstStoryUnlockedEmails = (ids: string[]) => sendRewardEmails('unlocked', ids);
export const sendAudiobookReadyEmails = (ids: string[]) => sendRewardEmails('audiobook-ready', ids);

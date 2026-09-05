import type { NewAnalyticsOutboxEntry } from '@/db/schema';

export const SIGN_UP_RECOVERY_MS = 24 * 60 * 60 * 1000;

/** Clerk supplies Unix milliseconds; never substitute login or webhook receipt time. */
export function clerkCreationTime(value: unknown, now = new Date()): Date | undefined {
  const time = value instanceof Date ? value.getTime() : value;
  if (typeof time !== 'number' || !Number.isFinite(time) || time <= 0 || time > now.getTime()) {
    return undefined;
  }
  const result = new Date(time);
  return Number.isFinite(result.getTime()) ? result : undefined;
}

export function canRecoverSignUp(
  occurredAt: Date | undefined,
  now = new Date(),
): occurredAt is Date {
  return Boolean(
    occurredAt && occurredAt <= now && now.getTime() - occurredAt.getTime() < SIGN_UP_RECOVERY_MS,
  );
}

/** A later campaign cannot become the acquisition source of an earlier registration. */
export function signUpAttributionMatchesCreation(
  occurredAt: Date,
  attribution: { createdAt: Date; latestAttributionAt?: Date | null; sessionId?: number | null },
): boolean {
  const createdAt = attribution.createdAt.getTime();
  const eventTime = occurredAt.getTime();
  const latestAt = attribution.latestAttributionAt?.getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(eventTime)) return false;
  if (
    latestAt !== undefined &&
    (!Number.isFinite(latestAt) || (latestAt > eventTime && latestAt !== createdAt))
  )
    return false;
  const sessionStart = attribution.sessionId ? attribution.sessionId * 1000 : undefined;
  if (sessionStart !== undefined && (!Number.isFinite(sessionStart) || sessionStart > eventTime))
    return false;
  if (createdAt <= eventTime) return true;
  // Late consent is eligible only when the captured GA session already covered creation.
  // A fresh session after registration is insufficient evidence; do not invent pre-consent tracking.
  return Boolean(
    sessionStart &&
    Number.isFinite(sessionStart) &&
    sessionStart <= eventTime &&
    eventTime - sessionStart < SIGN_UP_RECOVERY_MS &&
    createdAt - eventTime < SIGN_UP_RECOVERY_MS,
  );
}

export function signUpOutboxEntry(clerkUserId: string, occurredAt: Date): NewAnalyticsOutboxEntry {
  return {
    dedupeKey: `sign_up:${clerkUserId}`,
    eventName: 'sign_up',
    userId: clerkUserId,
    params: { method: 'unknown' },
    occurredAt,
    availableAt: new Date(occurredAt.getTime() + 5 * 60 * 1000),
  };
}

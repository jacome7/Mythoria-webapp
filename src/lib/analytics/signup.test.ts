import {
  canRecoverSignUp,
  clerkCreationTime,
  SIGN_UP_RECOVERY_MS,
  signUpAttributionMatchesCreation,
  signUpOutboxEntry,
} from './signup';

const now = new Date('2026-09-05T12:00:00Z');
const created = new Date('2026-09-05T11:00:00Z');

describe('authoritative registration time', () => {
  it.each([
    undefined,
    null,
    '2026-09-05',
    NaN,
    Infinity,
    -1,
    0,
    new Date('invalid'),
    now.getTime() + 1,
  ])('rejects an invalid or future Clerk date: %p', (value) => {
    expect(clerkCreationTime(value, now)).toBeUndefined();
  });
  it('accepts both Clerk millisecond and Date representations without changing time', () => {
    expect(clerkCreationTime(created.getTime(), now)).toEqual(created);
    expect(clerkCreationTime(created, now)).toEqual(created);
    expect(signUpOutboxEntry('user-1', created)).toMatchObject({
      dedupeKey: 'sign_up:user-1',
      occurredAt: created,
      availableAt: new Date('2026-09-05T11:05:00Z'),
    });
  });
  it('limits recovery to the original first 24 hours', () => {
    expect(canRecoverSignUp(created, now)).toBe(true);
    expect(canRecoverSignUp(new Date(now.getTime() - SIGN_UP_RECOVERY_MS), now)).toBe(false);
    expect(canRecoverSignUp(new Date(now.getTime() + 1), now)).toBe(false);
    expect(canRecoverSignUp(undefined, now)).toBe(false);
  });
});

describe('signup acquisition belongs to the creation journey', () => {
  it('accepts attribution already present before creation', () => {
    expect(
      signUpAttributionMatchesCreation(created, { createdAt: new Date('2026-09-05T10:59:00Z') }),
    ).toBe(true);
  });
  it('recovers late consent when the same GA session already covered creation', () => {
    const consentAt = new Date('2026-09-05T11:02:00Z');
    expect(
      signUpAttributionMatchesCreation(created, {
        createdAt: consentAt,
        latestAttributionAt: consentAt,
        sessionId: new Date('2026-09-05T10:59:00Z').getTime() / 1000,
      }),
    ).toBe(true);
  });
  it('refuses a new session or unproved journey after creation', () => {
    const consentAt = new Date('2026-09-05T11:02:00Z');
    expect(signUpAttributionMatchesCreation(created, { createdAt: consentAt })).toBe(false);
    expect(
      signUpAttributionMatchesCreation(created, {
        createdAt: consentAt,
        sessionId: consentAt.getTime() / 1000,
      }),
    ).toBe(false);
  });
  it('does not assign a subsequent campaign to an earlier signup', () => {
    expect(
      signUpAttributionMatchesCreation(created, {
        createdAt: new Date('2026-09-05T10:59:00Z'),
        latestAttributionAt: new Date('2026-09-05T11:02:00Z'),
      }),
    ).toBe(false);
  });

  it('rejects a subsequent session even if the stored attribution predates creation', () => {
    expect(
      signUpAttributionMatchesCreation(created, {
        createdAt: new Date('2026-09-05T10:59:00Z'),
        sessionId: new Date('2026-09-05T11:02:00Z').getTime() / 1000,
      }),
    ).toBe(false);
  });
});

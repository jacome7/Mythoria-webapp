import {
  commissionCents,
  cumulativeReversalCents,
  modeForOwner,
  referralCodeSchema,
  requireReferralPermission,
} from './policy';
import { referralMonthPeriod } from './calendar';

describe('referral financial policy', () => {
  it.each([
    [999, 1000, 100],
    [2499, 1250, 312],
    [5, 1000, 1],
    [0, 1000, 0],
    [12345, 10000, 12345],
  ])('rounds %i cents at %i bps to %i cents', (gross, rate, result) =>
    expect(commissionCents(gross, rate)).toBe(result),
  );
  it.each([-1, NaN, Infinity, 1.2])('rejects invalid money %s', (value) =>
    expect(() => commissionCents(value, 1000)).toThrow(),
  );
  it('uses cumulative refunds without rounding drift and caps at the original', () => {
    const original = commissionCents(999, 1000);
    const totals = [100, 200, 400, 999, 1200].map((refund) =>
      cumulativeReversalCents(original, 999, refund),
    );
    expect(totals).toEqual([10, 20, 40, 100, 100]);
    expect(totals[totals.length - 1]).toBe(original);
  });
  it('normalizes valid codes and rejects URL and short input', () => {
    expect(referralCodeSchema.parse('  book_2026 ')).toBe('BOOK_2026');
    for (const value of ['abc', 'https://example.com', 'A'.repeat(33), '💰ABCD'])
      expect(referralCodeSchema.safeParse(value).success).toBe(false);
  });
  it('does not grant finance privileges to a manager', () => {
    expect(() =>
      requireReferralPermission(
        {
          type: 'admin_mcp',
          id: 'management',
          permissions: ['referrals:view', 'referrals:manage'],
        },
        'referrals:settle',
      ),
    ).toThrow('forbidden');
  });
  it('keeps commission disabled by default and restricts live pilot owners', () => {
    const previous = { ...process.env };
    try {
      delete process.env.REFERRAL_PROGRAM_ENABLED;
      expect(modeForOwner('owner')).toBeNull();
      Object.assign(process.env, {
        REFERRAL_PROGRAM_ENABLED: 'true',
        REFERRAL_COMMISSION_ENABLED: 'true',
        REFERRAL_MODE: 'live',
        REFERRAL_PILOT_OWNER_IDS: 'owner',
      });
      expect(modeForOwner('owner')).toBe('live');
      expect(modeForOwner('other')).toBeNull();
      process.env.REFERRAL_MODE = 'shadow';
      expect(modeForOwner('other')).toBe('shadow');
    } finally {
      process.env = previous;
    }
  });
  it.each([
    ['2026-04-01T02:00:00Z', '2026-03-01T00:00:00.000Z', '2026-03-31T22:59:59.999Z'],
    ['2026-11-01T03:00:00Z', '2026-09-30T23:00:00.000Z', '2026-10-31T23:59:59.999Z'],
    ['2027-01-01T03:00:00Z', '2026-12-01T00:00:00.000Z', '2026-12-31T23:59:59.999Z'],
  ])('closes the correct Lisbon month at %s', (now, start, end) => {
    const period = referralMonthPeriod(new Date(now));
    expect(period.start.toISOString()).toBe(start);
    expect(period.end.toISOString()).toBe(end);
  });
});

import { REFERRAL_POLICY } from './policy';

/** Convert civil month boundaries without assuming Lisbon's UTC offset. */
export function referralMonthPeriod(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: REFERRAL_POLICY.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = (date: Date) =>
    Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  const local = parts(now);
  const midnight = (year: number, month: number) => {
    const desired = Date.UTC(year, month, 1);
    let instant = desired;
    for (let i = 0; i < 3; i++) {
      const p = parts(new Date(instant));
      const rendered = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
      instant += desired - rendered;
    }
    return new Date(instant);
  };
  return {
    start: midnight(+local.year, +local.month - 2),
    end: new Date(midnight(+local.year, +local.month - 1).getTime() - 1),
  };
}

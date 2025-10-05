import { formatDate } from '@/utils/date';

describe('formatDate', () => {
  it('formats date with locale and options', () => {
    expect(
      formatDate('2024-06-17T12:34:56Z', {
        locale: 'en-US',
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    ).toBe('Jun 17, 2024');
  });

  it('formats using different locale', () => {
    expect(
      formatDate('2024-06-17T12:34:56Z', {
        locale: 'de-DE',
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }),
    ).toBe('17.06.24');
  });

  it('returns dash for invalid dates', () => {
    expect(formatDate('invalid-date')).toBe('-');
  });
});

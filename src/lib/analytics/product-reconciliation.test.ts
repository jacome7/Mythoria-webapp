import { classifyProductOutboxState } from './product-reconciliation';

const now = new Date('2026-08-15T12:00:00.000Z');
const base = {
  availableAt: new Date('2026-08-15T11:00:00.000Z'),
  attempts: 0,
  deliveredAt: null,
  skippedAt: null,
  lastError: null,
};

describe('product analytics reconciliation', () => {
  it('classifies every delivery state without mutating requests or outbox rows', () => {
    expect(classifyProductOutboxState(undefined, now)).toBe('missing');
    expect(classifyProductOutboxState(base, now)).toBe('pending');
    expect(
      classifyProductOutboxState(
        { ...base, availableAt: new Date('2026-08-15T13:00:00.000Z') },
        now,
      ),
    ).toBe('deferred');
    expect(classifyProductOutboxState({ ...base, deliveredAt: now }, now)).toBe('delivered');
    expect(classifyProductOutboxState({ ...base, skippedAt: now }, now)).toBe('skipped');
    expect(classifyProductOutboxState({ ...base, attempts: 2, lastError: 'HTTP 500' }, now)).toBe(
      'failed',
    );
  });
});

import {
  activeExperiment,
  canObserveReader,
  productExperimentRelease,
  type ProductExperimentRelease,
} from './release';

const baseline = '2026-12-01T00:00:00Z';
const first = { startsAt: '2026-12-02T00:00:00Z', endsAt: '2026-12-12T00:00:00Z' };
const second = { startsAt: first.endsAt, endsAt: '2026-12-22T00:00:00Z' };
const release: ProductExperimentRelease = {
  baselineReconciledAt: baseline,
  windows: { mobile_idea_entry: first, reader_cta: second },
};

it('ships off and fails closed without a reconciled baseline, on overlaps, and out-of-order windows', () => {
  const now = Date.parse(first.startsAt);
  for (const config of [
    productExperimentRelease,
    { ...release, baselineReconciledAt: null },
    { ...release, windows: { reader_cta: first } },
    { ...release, windows: { mobile_idea_entry: first, offer_clarity: second } },
    { ...release, windows: { mobile_idea_entry: first, reader_cta: first } },
  ]) {
    expect(activeExperiment(config, now)).toBeNull();
    expect(canObserveReader(config, now)).toBe(false);
  }
});
it('switches at the UTC boundary and closes reader observation after the last D7 window', () => {
  expect(activeExperiment(release, Date.parse(first.startsAt))).toBe('mobile_idea_entry');
  expect(activeExperiment(release, Date.parse(first.endsAt))).toBe('reader_cta');
  expect(activeExperiment(release, Date.parse(second.endsAt))).toBeNull();
  expect(canObserveReader(release, Date.parse(second.endsAt))).toBe(true);
  expect(canObserveReader(release, Date.parse('2026-12-29T00:00:00Z'))).toBe(false);
});

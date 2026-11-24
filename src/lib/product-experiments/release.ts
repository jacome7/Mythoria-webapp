export const experimentOrder = ['mobile_idea_entry', 'reader_cta', 'offer_clarity'] as const;
export type ExperimentId = (typeof experimentOrder)[number];
export type ExperimentArm = 'control' | 'treatment';

type ExperimentWindow = { startsAt: string; endsAt: string };
export interface ProductExperimentRelease {
  baselineReconciledAt: string | null;
  windows: Partial<Record<ExperimentId, ExperimentWindow>>;
}

// Set only from a reviewed release record after reconciliation. Empty is the kill switch.
export const productExperimentRelease: ProductExperimentRelease = {
  baselineReconciledAt: null,
  windows: {},
};

export function activeExperiment(
  release: ProductExperimentRelease,
  now: number,
): ExperimentId | null {
  if (!release.baselineReconciledAt) return null;
  let previousEnd = Date.parse(release.baselineReconciledAt);
  let found: ExperimentId | null = null;
  let missingPrevious = false;
  for (const id of experimentOrder) {
    const window = release.windows[id];
    if (!window) {
      missingPrevious = true;
      continue;
    }
    const start = Date.parse(window.startsAt);
    const end = Date.parse(window.endsAt);
    if (missingPrevious || !(start >= previousEnd && end > start)) return null;
    if (start <= now && now < end) found = id;
    previousEnd = end;
  }
  return found;
}

export const FOLLOWUP_MS = 7 * 86_400_000;
export function canObserveReader(release: ProductExperimentRelease, now: number) {
  return experimentOrder.some((id) => {
    const window = release.windows[id];
    if (!window) return false;
    const end = Date.parse(window.endsAt);
    return now < end + FOLLOWUP_MS && activeExperiment(release, Math.min(now, end - 1)) === id;
  });
}

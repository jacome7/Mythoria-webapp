import kidsFantasyMeta from '../../../public/homepage/kids_fantasy/assets_metadata.json';
import sportsTeamsMeta from '../../../public/homepage/sports_teams/assets_metadata.json';
import romanceMeta from '../../../public/homepage/romance/assets_metadata.json';
import grandparentsMeta from '../../../public/homepage/grandparents/assets_metadata.json';

/**
 * Build-time manifest of the hero assets in every style folder
 * (`public/homepage/<styleId>/`). The metadata JSON files are bundled at build
 * time, so asset resolution never probes the network for missing files —
 * a slot/locale that doesn't exist simply falls back deterministically:
 *
 *   exact locale → en-US → pt-PT → unsuffixed default → first available
 *
 * See docs/papercut-design-system.md ("Style folders") for the slot grammar.
 */

export type HeroStyleId = 'kids_fantasy' | 'sports_teams' | 'romance' | 'grandparents';
export type HeroDevice = 'laptop' | 'mobile';

export type AssetStatus = 'final' | 'draft' | 'placeholder' | 'missing';

export interface ResolvedAsset {
  /** Public src, e.g. /homepage/romance/background_mobile_pt-PT.webp */
  src: string;
  /** Intrinsic pixel size — lets next/image reserve the aspect ratio (no CLS). */
  w: number;
  h: number;
  status: AssetStatus;
}

interface ManifestEntry {
  file: string;
  slot: string;
  device?: HeroDevice;
  locale?: string;
  dimensions?: { w: number; h: number };
  status: AssetStatus;
}

interface StyleMetadata {
  styleId: string;
  assets: ManifestEntry[];
}

const MANIFEST: Record<HeroStyleId, StyleMetadata> = {
  kids_fantasy: kidsFantasyMeta as StyleMetadata,
  sports_teams: sportsTeamsMeta as StyleMetadata,
  romance: romanceMeta as StyleMetadata,
  grandparents: grandparentsMeta as StyleMetadata,
};

const FALLBACK_LOCALES = ['en-US', 'pt-PT'] as const;

function toResolved(style: HeroStyleId, entry: ManifestEntry): ResolvedAsset {
  return {
    src: `/homepage/${style}/${entry.file}`,
    w: entry.dimensions?.w ?? 0,
    h: entry.dimensions?.h ?? 0,
    status: entry.status,
  };
}

/** Selects a locale variant with Mythoria's shared fallback priority. */
export function resolveLocaleFallback<T extends { locale?: string }>(
  candidates: T[],
  locale?: string,
  sortKey: (candidate: T) => string = (candidate) => String(candidate),
): T | undefined {
  const byLocale = (candidateLocale: string | undefined) =>
    candidates.find((candidate) => candidate.locale === candidateLocale);

  return (
    (locale ? byLocale(locale) : undefined) ??
    FALLBACK_LOCALES.map((fallbackLocale) => byLocale(fallbackLocale)).find(Boolean) ??
    byLocale(undefined) ??
    [...candidates].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))[0]
  );
}

/**
 * Resolve the asset for a slot, preferring the visitor's locale. Returns null
 * only when the slot has no usable asset at all (the validation script —
 * `npm run homepage:assets` — fails CI before that can happen for required slots).
 */
export function resolveAsset(
  style: HeroStyleId,
  slot: string,
  opts?: { device?: HeroDevice; locale?: string },
): ResolvedAsset | null {
  const candidates = MANIFEST[style].assets.filter(
    (a) => a.slot === slot && a.status !== 'missing' && (a.device ?? undefined) === opts?.device,
  );
  if (candidates.length === 0) return null;

  const match = resolveLocaleFallback(candidates, opts?.locale, (candidate) => candidate.file);

  return match ? toResolved(style, match) : null;
}

/**
 * The person carousel slides for a style+locale: person1..personN, each
 * resolved through the locale fallback chain, deduped by file (so five locale
 * copies of the same slot never produce duplicate slides, but two slots that
 * legitimately resolve to different files both appear).
 */
export function resolvePersons(style: HeroStyleId, locale: string): ResolvedAsset[] {
  const slots = new Set(
    MANIFEST[style].assets
      .filter((a) => /^person\d+$/.test(a.slot) && a.status !== 'missing')
      .map((a) => a.slot),
  );
  const ordered = [...slots].sort(
    (a, b) => parseInt(a.replace('person', ''), 10) - parseInt(b.replace('person', ''), 10),
  );

  const persons: ResolvedAsset[] = [];
  const seen = new Set<string>();
  for (const slot of ordered) {
    const resolved = resolveAsset(style, slot, { locale });
    if (resolved && !seen.has(resolved.src)) {
      seen.add(resolved.src);
      persons.push(resolved);
    }
  }
  return persons;
}

'use client';

import { useEffect, useState } from 'react';
import { normalizeIntent } from '@/constants/intents';

/**
 * Reads an `?intent=` query-param override for the homepage hero composition
 * (precedence: query > cookie > default). Useful for previews, demos and
 * campaign links without going through the /i/:intent cookie flow.
 *
 * Reads after hydration (instead of useSearchParams) so the statically
 * prerendered homepage keeps the hero in its static HTML — with the param
 * present the default hero shows for one frame before swapping, which is an
 * accepted trade-off for a preview mechanism. Returns null on the server and
 * on pages without the param; invalid values fall back to the default
 * composition inside resolveComposition().
 */
export function useIntentOverride(): string | null {
  const [override, setOverride] = useState<string | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('intent');
    if (value) setOverride(normalizeIntent(value));
  }, []);

  return override;
}

import type { StoryIntent } from '@/constants/intents';
import type { PaperCutComposition } from './types';
import { kidsFantasy } from './compositions/kidsFantasy';
import { kidsSports } from './compositions/kidsSports';

/**
 * Maps a visitor's intent (or the no-intent default) to a paper-cut composition.
 *
 * Intents without an entry fall back to `default` (kids_fantasy). To add a
 * themed scene for an intent:
 *   1. drop role-named assets + assets_metadata.json into `public/homepage/<id>/`
 *   2. author `compositions/<id>/index.ts`
 *   3. add one line below (e.g. `romance: romance`)
 * The renderer needs no changes.
 */
const COMPOSITIONS: Partial<Record<StoryIntent | 'default', PaperCutComposition>> = {
  default: kidsFantasy,
  sports_teams: kidsSports,
};

export function resolveComposition(intent?: StoryIntent | string | null): PaperCutComposition {
  if (intent && intent in COMPOSITIONS) {
    return COMPOSITIONS[intent as StoryIntent] ?? kidsFantasy;
  }
  return COMPOSITIONS.default ?? kidsFantasy;
}

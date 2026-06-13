import type { StoryIntent } from '@/constants/intents';
import type { HeroComposition } from './types';
import { kidsFantasy } from './compositions/kidsFantasy';
import { sportsTeams } from './compositions/sports_teams';
import { romance } from './compositions/romance';

/**
 * Maps a visitor's intent (or the no-intent default) to a hero style
 * composition.
 *
 * Intents without an entry fall back to `default` (kids_fantasy). To add a
 * themed style for an intent:
 *   1. drop slot-named assets + assets_metadata.json into `public/homepage/<id>/`
 *      (run `npm run homepage:assets` to validate)
 *   2. author `compositions/<id>/{index.ts, theme.module.css}` (~25 lines)
 *   3. add one line below (e.g. `pet_stories: petStories`)
 * The renderer needs no changes.
 */
const COMPOSITIONS: Partial<Record<StoryIntent | 'default', HeroComposition>> = {
  default: kidsFantasy,
  sports_teams: sportsTeams,
  romance: romance,
};

export function resolveComposition(intent?: StoryIntent | string | null): HeroComposition {
  if (intent && intent in COMPOSITIONS) {
    return COMPOSITIONS[intent as StoryIntent] ?? kidsFantasy;
  }
  return COMPOSITIONS.default ?? kidsFantasy;
}

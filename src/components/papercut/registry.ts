import { getValidatedIntent } from '@/lib/campaign-context';
import type { StoryIntent } from '@/constants/intents';
import type { HeroComposition } from './types';
import { kidsFantasy } from './compositions/kidsFantasy';
import { sportsTeams } from './compositions/sports_teams';
import { romance } from './compositions/romance';
import { grandparents } from './compositions/grandparents';
import { christmas } from './compositions/christmas';

/**
 * Maps campaign intent to the homepage hero composition.
 *
 * Christmas is the default without a valid intent. Use Kids Fantasy for valid
 * intents that lack a custom composition. To add a
 * custom composition:
 *   1. drop slot-named assets + assets_metadata.json into `public/homepage/<id>/`
 *      (run `npm run homepage:assets` to validate)
 *   2. author `compositions/<id>/{index.ts, theme.module.css}` (~25 lines)
 *   3. add one line below (e.g. `pet_stories: petStories`)
 * The renderer needs no changes.
 */
const COMPOSITIONS: Partial<Record<StoryIntent, HeroComposition>> = {
  christmas,
  sports_teams: sportsTeams,
  romance: romance,
  grandparents: grandparents,
};

export function resolveComposition(rawIntent?: string | null): HeroComposition {
  const intent = getValidatedIntent(rawIntent);
  return intent ? (COMPOSITIONS[intent] ?? kidsFantasy) : christmas;
}

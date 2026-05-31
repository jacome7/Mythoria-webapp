import type { StoryIntent } from '@/constants/intents';
import type { PaperCutComposition } from './types';
import { kidsFantasy } from './compositions/kidsFantasy';

/**
 * Maps a visitor's intent (or the no-intent default) to a paper-cut composition.
 *
 * Today every visitor sees `kids_fantasy`. To add a themed scene for an intent:
 *   1. author `compositions/<id>.ts`
 *   2. add one line below (e.g. `romance: romance`)
 * The renderer needs no changes.
 */
const COMPOSITIONS: Partial<Record<StoryIntent | 'default', PaperCutComposition>> = {
  default: kidsFantasy,
};

export function resolveComposition(intent?: StoryIntent | string | null): PaperCutComposition {
  if (intent && intent in COMPOSITIONS) {
    return COMPOSITIONS[intent as StoryIntent] ?? kidsFantasy;
  }
  return COMPOSITIONS.default ?? kidsFantasy;
}

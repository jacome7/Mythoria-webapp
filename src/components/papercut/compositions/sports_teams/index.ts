import type { HeroComposition } from '../../types';
import anims from '../shared/animations.module.css';
import theme from './theme.module.css';

/**
 * sports_teams — football/youth-team yearbook style. Pennant sways top-left,
 * trophy bobs top-right, green pitch with clubhouse behind a player holding
 * the team book. Mapped from the `sports_teams` intent in the registry.
 * Assets: public/homepage/sports_teams/ (see assets_metadata.json).
 */
export const sportsTeams: HeroComposition = {
  id: 'sports_teams',
  rootClassName: `${anims.root} ${theme.root}`,
  textNamespace: 'intents.sports_teams.hero',
  decor: {
    sky_left: { anim: 'sway', animDurMs: 7000, base: { width: 20 }, md: { width: 13 }, lg: { width: 8 } },
    sky_right: { anim: 'bob', animDurMs: 6000, base: { width: 15 }, md: { width: 10 }, lg: { width: 7 } },
  },
  ctaPath: 'tell-your-story',
};

import type { HeroComposition } from '../../types';
import anims from '../shared/animations.module.css';
import theme from './theme.module.css';

export const christmas: HeroComposition = {
  id: 'christmas',
  textNamespace: 'intents.kids_fantasy.hero',
  personAltKey: 'intents.christmas.hero.alt.person',
  rootClassName: `${anims.root} ${theme.root}`,
  decor: {
    sky_left: {
      base: { x: 1, y: 5, width: 18 },
      md: { x: 4, y: 9, width: 14 },
      lg: { x: 6, y: 8, width: 12 },
      anim: 'bob',
      animDurMs: 9500,
    },
    sky_right: {
      base: { x: 78, y: 7, width: 18 },
      lg: { x: 84, y: 2, width: 10 },
      anim: 'bob',
      animDurMs: 8500,
    },
    cloud_left: { base: { x: 23, y: 4, width: 10 }, lg: { x: 26, y: 10, width: 7 } },
    cloud_right: { base: { x: 82, y: 14, width: 16 }, lg: { x: 83, y: 16, width: 13 } },
    sparkles: { base: { y: 4, width: 17 }, md: { y: 3, width: 12 }, lg: { y: 2, width: 9 } },
  },
  person: {
    width: { base: 46, md: 30, lg: 27 },
    bottom: { base: 8, md: 8, lg: 8 },
  },
  storyIntent: 'christmas',
};

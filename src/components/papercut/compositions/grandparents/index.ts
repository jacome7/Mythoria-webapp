import type { HeroComposition } from '../../types';
import anims from '../shared/animations.module.css';
import theme from './theme.module.css';

/**
 * grandparents — intergenerational family-story style. Balloon, moon and warm
 * star sit above a Douro-inspired papercut river scene with grandparents and a
 * grandchild holding their personalized family book.
 */
export const grandparents: HeroComposition = {
  id: 'grandparents',
  rootClassName: `${anims.root} ${theme.root}`,
  textNamespace: 'intents.grandparents.hero',
  decor: {
    sky_left: {
      anim: 'balloon',
      animDurMs: 10200,
      base: { x: 0, y: 0, width: 18 },
      md: { x: 6, y: 3, width: 12 },
      lg: { x: 10, y: 4, width: 7 },
    },
    sky_right: {
      anim: 'bob',
      animDurMs: 8200,
      base: { x: 79, y: 7, width: 17 },
      md: { x: 80, y: 6, width: 11 },
      lg: { x: 84, y: 5, width: 7 },
    },
    sparkles: {
      anim: 'twinkle',
      animDurMs: 5000,
      base: { y: 16, width: 12 },
      md: { y: 8, width: 8 },
      lg: { y: 3, width: 5 },
    },
  },
  person: {
    width: { base: 78, md: 48, lg: 34 },
    bottom: { base: 6, md: 5, lg: 4 },
  },
  storyIntent: 'grandparents',
};

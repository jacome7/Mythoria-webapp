import type { HeroComposition } from '../../types';
import anims from '../shared/animations.module.css';
import theme from './theme.module.css';

/**
 * kids_fantasy — the default style. Hot-air balloon floats top-left, crescent
 * moon arcs top-right, castle hills behind a child holding their storybook.
 * Assets: public/homepage/kids_fantasy/ (see assets_metadata.json).
 */
export const kidsFantasy: HeroComposition = {
  id: 'kids_fantasy',
  rootClassName: `${anims.root} ${theme.root}`,
  textNamespace: 'intents.kids_fantasy.hero',
  decor: {
    sky_left: { anim: 'balloon', animDurMs: 9500 },
    sky_right: { anim: 'arc', animDurMs: 18000 },
  },
  person: {
    bottom: { base: 10, md: 8, lg: 7 },
  },
  ctaPath: 'tell-your-story',
};

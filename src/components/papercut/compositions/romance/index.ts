import type { HeroComposition } from '../../types';
import anims from '../shared/animations.module.css';
import theme from './theme.module.css';

/**
 * romance — couple's story style. Striped hot-air balloon floats top-left,
 * paper hearts drift top-right, seaside village at dusk behind a couple
 * holding their book. Mapped from the `romance` intent in the registry.
 * Assets: public/homepage/romance/ (see assets_metadata.json).
 */
export const romance: HeroComposition = {
  id: 'romance',
  rootClassName: `${anims.root} ${theme.root}`,
  textNamespace: 'intents.romance.hero',
  decor: {
    sky_left: { anim: 'balloon', animDurMs: 10500, base: { width: 17 }, md: { width: 11 }, lg: { width: 7 } },
    sky_right: { anim: 'bob', animDurMs: 7600 },
  },
  // The romance couple cutout is wider (723×1024) than the single-child
  // cutouts (572×1024) — widen the band slightly to keep the same visual height.
  person: { width: { base: 62, md: 40, lg: 30 } },
  ctaPath: 'tell-your-story',
};

import { familyTravelLocalizedLandingPages } from './family-travel.localized';
import { grandparentsLocalizedLandingPages } from './grandparents-stories.localized';
import { romanceLocalizedLandingPages } from './romance-gifts.localized';
import type { LandingPageContent } from './types';

export const localizedLandingPages = [
  ...familyTravelLocalizedLandingPages,
  ...romanceLocalizedLandingPages,
  ...grandparentsLocalizedLandingPages,
] satisfies LandingPageContent[];

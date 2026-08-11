import { childrenBooksLocalizedLandingPages } from './children-books.localized';
import { familyTravelLocalizedLandingPages } from './family-travel.localized';
import { grandparentsLocalizedLandingPages } from './grandparents-stories.localized';
import { romanceLocalizedLandingPages } from './romance-gifts.localized';
import type { LandingPageContent } from './types';

export const localizedLandingPages = [
  ...childrenBooksLocalizedLandingPages,
  ...familyTravelLocalizedLandingPages,
  ...romanceLocalizedLandingPages,
  ...grandparentsLocalizedLandingPages,
] satisfies LandingPageContent[];

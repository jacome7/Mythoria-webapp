import type { SurveyDefinitionInput } from '@/lib/surveys/definition-schema';
import { activationNoStoryV2 } from './activation_no_story.v2';
import { freeCreatorNoPurchaseV2 } from './free_creator_no_purchase.v2';
import { freeCreatorNoPurchaseV3 } from './free_creator_no_purchase.v3';
import { payingCreatorV3 } from './paying_creator.v3';
import { payingCreatorV5 } from './paying_creator.v5';

/**
 * Registry of every code-defined survey version. Published versions are immutable: to change
 * wording, options or branching, add a new `<id>.v<N+1>.ts` file and register it here.
 *
 * Unused versions (never referenced by a study) were removed from the code and the database; the
 * remaining files are the versions live studies still reference.
 */
export const SURVEY_DEFINITIONS: readonly SurveyDefinitionInput[] = [
  activationNoStoryV2,
  freeCreatorNoPurchaseV2,
  freeCreatorNoPurchaseV3,
  payingCreatorV3,
  payingCreatorV5,
];

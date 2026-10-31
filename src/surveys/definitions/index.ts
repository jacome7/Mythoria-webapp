import type { SurveyDefinitionInput } from '@/lib/surveys/definition-schema';
import { activationNoStoryV1 } from './activation_no_story.v1';
import { activationNoStoryV2 } from './activation_no_story.v2';
import { demoAllControlsV1 } from './demo_all_controls.v1';
import { freeCreatorNoPurchaseV1 } from './free_creator_no_purchase.v1';
import { freeCreatorNoPurchaseV2 } from './free_creator_no_purchase.v2';
import { payingCreatorV1 } from './paying_creator.v1';
import { payingCreatorV2 } from './paying_creator.v2';
import { payingCreatorV3 } from './paying_creator.v3';

/**
 * Registry of every code-defined survey version. Published versions are immutable: to change
 * wording, options or branching, add a new `<id>.v<N+1>.ts` file and register it here.
 */
export const SURVEY_DEFINITIONS: readonly SurveyDefinitionInput[] = [
  activationNoStoryV1,
  activationNoStoryV2,
  freeCreatorNoPurchaseV1,
  freeCreatorNoPurchaseV2,
  payingCreatorV1,
  payingCreatorV2,
  payingCreatorV3,
  demoAllControlsV1,
];

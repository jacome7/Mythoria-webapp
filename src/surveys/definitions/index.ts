import type { SurveyDefinitionInput } from '@/lib/surveys/definition-schema';
import { activationNoStoryV1 } from './activation_no_story.v1';
import { activationNoStoryV2 } from './activation_no_story.v2';
import { demoAllControlsV1 } from './demo_all_controls.v1';
import { freeCreatorNoPurchaseV1 } from './free_creator_no_purchase.v1';
import { freeCreatorNoPurchaseV2 } from './free_creator_no_purchase.v2';
import { freeCreatorNoPurchaseV3 } from './free_creator_no_purchase.v3';
import { payingCreatorV1 } from './paying_creator.v1';
import { payingCreatorV2 } from './paying_creator.v2';
import { payingCreatorV3 } from './paying_creator.v3';
import { payingCreatorV4 } from './paying_creator.v4';
import { payingCreatorV5 } from './paying_creator.v5';

/**
 * Registry of every code-defined survey version. Published versions are immutable: to change
 * wording, options or branching, add a new `<id>.v<N+1>.ts` file and register it here.
 */
export const SURVEY_DEFINITIONS: readonly SurveyDefinitionInput[] = [
  activationNoStoryV1,
  activationNoStoryV2,
  freeCreatorNoPurchaseV1,
  freeCreatorNoPurchaseV2,
  freeCreatorNoPurchaseV3,
  payingCreatorV1,
  payingCreatorV2,
  payingCreatorV3,
  payingCreatorV4,
  payingCreatorV5,
  demoAllControlsV1,
];

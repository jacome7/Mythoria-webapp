import { z } from 'zod';

/**
 * Declarative survey definition contract.
 *
 * Survey definitions are authored in code (`src/surveys/definitions`), validated with this
 * schema plus `validateSurveyDefinition`, and published immutably to `survey_versions`.
 * Every user-facing string is localized for all supported locales so a persisted version is
 * self-contained and historical responses stay interpretable.
 */

export const SURVEY_SCHEMA_VERSION = 1;

export const SURVEY_LOCALES = ['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE'] as const;
export type SurveyLocale = (typeof SURVEY_LOCALES)[number];
export const SURVEY_SOURCE_LOCALE: SurveyLocale = 'en-US';

/** Exhaustive: every supported locale must have a non-empty string. */
export const localizedTextSchema = z.record(z.enum(SURVEY_LOCALES), z.string().trim().min(1));
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const codeId = z.string().regex(/^[a-z0-9_]+$/, 'Use lowercase letters, digits and underscores');
const questionId = z.string().regex(/^[A-Za-z0-9_]+$/, 'Use letters, digits and underscores');

export const QUESTION_TYPES = [
  'single_choice',
  'multi_choice',
  'buttons',
  'short_text',
  'long_text',
  'number',
  'slider',
  'stars',
  'smileys',
  'select',
  'static_content',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Question types whose answers are option ids. */
export const CHOICE_QUESTION_TYPES = [
  'single_choice',
  'multi_choice',
  'buttons',
  'select',
  'stars',
  'smileys',
] as const satisfies readonly QuestionType[];

/** Question types that persist a numeric value (stars/smileys via option `value`). */
export const NUMERIC_QUESTION_TYPES = [
  'number',
  'slider',
  'stars',
  'smileys',
] as const satisfies readonly QuestionType[];

export const surveyOptionSchema = z.object({
  /** Stable coded value persisted with answers. Never change once published. */
  id: codeId,
  label: localizedTextSchema,
  /** Numeric score for rating scales (stars/smileys). */
  value: z.number().int().optional(),
  /** Explicit "not applicable / don't know / haven't used" answer; excluded from averages. */
  notApplicable: z.boolean().optional(),
  /** Multi-select only: selecting this option deselects all others (e.g. "None"). */
  exclusive: z.boolean().optional(),
  /** Reveals an optional short free-text field ("Something else"). */
  allowOtherText: z.boolean().optional(),
});
export type SurveyOption = z.infer<typeof surveyOptionSchema>;

export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'in',
  'not_in',
  'contains',
  'not_contains',
  'gt',
  'gte',
  'lt',
  'lte',
  'answered',
  'not_answered',
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/**
 * Leaf condition semantics (evaluated by `engine.ts`):
 * - equals / not_equals / in / not_in: single-selected option id (string) or numeric value.
 * - contains / not_contains: multi-select includes option id.
 * - gt / gte / lt / lte: numeric value (number, slider, stars, smileys) — N/A answers never match.
 * - answered / not_answered: no `value`.
 * A referenced question that is hidden or unanswered makes every operator false except
 * `not_answered`.
 */
export const leafConditionSchema = z.object({
  question: questionId,
  operator: z.enum(CONDITION_OPERATORS),
  value: z.union([z.string(), z.number(), z.array(z.string()).min(1)]).optional(),
});
export type LeafCondition = z.infer<typeof leafConditionSchema>;

/** Intentionally one level deep: a leaf, or all/any of leaves. No arbitrary expressions. */
export const conditionSchema = z.union([
  leafConditionSchema,
  z.object({ all: z.array(leafConditionSchema).min(1) }),
  z.object({ any: z.array(leafConditionSchema).min(1) }),
]);
export type SurveyCondition = z.infer<typeof conditionSchema>;

/**
 * Facts about the invited author, frozen into the invitation snapshot when the audience is
 * snapshotted. Questions can be restricted to an audience; the server removes questions whose
 * audience does not match BEFORE the definition reaches the browser or the submission validator
 * (see `applyAudience` in `audience.ts`). A fact missing from an older snapshot never matches.
 */
export const AUDIENCE_FACTS = ['publishedStoryCount', 'usedPaidService', 'startedStory'] as const;
export type AudienceFact = (typeof AUDIENCE_FACTS)[number];

export const audienceConditionSchema = z.object({
  fact: z.enum(AUDIENCE_FACTS),
  /** `missing` matches when the snapshot has no value for the fact (older/unreliable data). */
  operator: z.enum(['equals', 'gte', 'lte', 'missing']),
  value: z.union([z.number().int().min(0), z.boolean()]).optional(),
});
export type AudienceCondition = z.infer<typeof audienceConditionSchema>;

const questionBase = {
  id: questionId,
  label: localizedTextSchema,
  help: localizedTextSchema.optional(),
  visibleWhen: conditionSchema.optional(),
  /** Restricts the question to authors whose snapshot facts match (all conditions must hold). */
  audience: z.array(audienceConditionSchema).min(1).optional(),
  /**
   * Optional screen grouping: consecutive questions with the same `screen` render together.
   * Without it, each question is its own screen.
   */
  screen: codeId.optional(),
};

const answerableBase = {
  ...questionBase,
  /** Business-facing analysis dimension shared across surveys (e.g. `primary_intent`). */
  dimension: codeId,
  required: z.boolean(),
};

const choiceOptions = z.array(surveyOptionSchema).min(2);

export const singleChoiceQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('single_choice'),
  options: choiceOptions,
});

export const selectQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('select'),
  options: choiceOptions,
});

export const multiChoiceQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('multi_choice'),
  options: choiceOptions,
  validation: z
    .object({
      minSelected: z.number().int().min(1).optional(),
      maxSelected: z.number().int().min(1).optional(),
    })
    .optional(),
});

/** Tap-friendly tiles. Same stored semantics as single_choice / multi_choice. */
export const buttonsQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('buttons'),
  selection: z.enum(['single', 'multiple']).default('single'),
  options: choiceOptions,
  validation: z
    .object({
      minSelected: z.number().int().min(1).optional(),
      maxSelected: z.number().int().min(1).optional(),
    })
    .optional(),
});

const textValidation = z
  .object({
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(1).max(5000),
  })
  .optional();

export const shortTextQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('short_text'),
  placeholder: localizedTextSchema.optional(),
  validation: textValidation,
});

export const longTextQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('long_text'),
  placeholder: localizedTextSchema.optional(),
  validation: textValidation,
});

export const numberQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('number'),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    integer: z.boolean().optional(),
  }),
  unit: localizedTextSchema.optional(),
});

export const sliderQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('slider'),
  validation: z.object({
    min: z.number(),
    max: z.number(),
    step: z.number().positive().default(1),
  }),
  minLabel: localizedTextSchema,
  maxLabel: localizedTextSchema,
  /** Optional explicit non-numeric answers, e.g. `unsure`. Must be `notApplicable`. */
  naOptions: z.array(surveyOptionSchema).optional(),
});

/** Ratings: options carry numeric `value` (1–5) plus optional `notApplicable` options. */
export const starsQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('stars'),
  options: choiceOptions,
});

export const smileysQuestionSchema = z.object({
  ...answerableBase,
  type: z.literal('smileys'),
  options: choiceOptions,
});

export const staticContentSchema = z.object({
  ...questionBase,
  type: z.literal('static_content'),
  body: localizedTextSchema.optional(),
});

export const surveyQuestionSchema = z.discriminatedUnion('type', [
  singleChoiceQuestionSchema,
  multiChoiceQuestionSchema,
  buttonsQuestionSchema,
  shortTextQuestionSchema,
  longTextQuestionSchema,
  numberQuestionSchema,
  sliderQuestionSchema,
  starsQuestionSchema,
  smileysQuestionSchema,
  selectQuestionSchema,
  staticContentSchema,
]);
export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;
export type AnswerableQuestion = Exclude<SurveyQuestion, { type: 'static_content' }>;

export const surveyDefinitionSchema = z.object({
  schemaVersion: z.literal(SURVEY_SCHEMA_VERSION),
  /** Stable survey id without version suffix, e.g. `activation_no_story`. */
  id: codeId,
  version: z.number().int().min(1),
  /** Internal, English-only description of the research purpose (admin context). */
  purpose: z.string().min(1),
  title: localizedTextSchema,
  description: localizedTextSchema,
  intro: localizedTextSchema.optional(),
  completionMessage: localizedTextSchema,
  estimatedMinutes: z.number().int().min(1).max(30),
  responsePolicy: z.object({
    identity: z.enum(['invitation', 'anonymous']),
    maxCompletedPerInvitation: z.number().int().min(1).default(1),
  }),
  /** Whether a valid submission can earn a campaign-configured reward. */
  rewardEligible: z.boolean().default(false),
  /** Demo/test surveys are never offered to customers. */
  internalOnly: z.boolean().default(false),
  questions: z.array(surveyQuestionSchema).min(1),
});
export type SurveyDefinition = z.infer<typeof surveyDefinitionSchema>;
export type SurveyDefinitionInput = z.input<typeof surveyDefinitionSchema>;

/**
 * Answer payload for a single question (client draft and server submission).
 * - choice: option ids (one for single-select types), optional "other" text.
 * - number: numeric value for `number` and `slider`.
 * - na: an explicit not-applicable option on a slider (`naOptions`).
 * - text: free text for short_text / long_text.
 */
export const answerValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('choice'),
    optionIds: z.array(codeId).min(1),
    otherText: z.string().max(500).optional(),
  }),
  z.object({ kind: z.literal('number'), value: z.number().finite() }),
  z.object({ kind: z.literal('na'), optionId: codeId }),
  z.object({ kind: z.literal('text'), text: z.string() }),
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

export const answersSchema = z.record(questionId, answerValueSchema);
export type SurveyAnswers = z.infer<typeof answersSchema>;

export function isAnswerable(question: SurveyQuestion): question is AnswerableQuestion {
  return question.type !== 'static_content';
}

/** True for single-select presentations (radio, select, single buttons, ratings). */
export function isSingleSelect(question: SurveyQuestion): boolean {
  return (
    question.type === 'single_choice' ||
    question.type === 'select' ||
    question.type === 'stars' ||
    question.type === 'smileys' ||
    (question.type === 'buttons' && question.selection === 'single')
  );
}

export function isMultiSelect(question: SurveyQuestion): boolean {
  return (
    question.type === 'multi_choice' ||
    (question.type === 'buttons' && question.selection === 'multiple')
  );
}

import { z } from 'zod';
import { GraphicalStyle, NovelStyle, TargetAudience } from '@/types/story-enums';
import type { StoryTemplate, StoryGuideQuestion } from '@/types/story-template';

export const STORY_GUIDE_LIMIT = 9;
export const storyPreferencesSchema = z
  .object({
    targetAudience: z.nativeEnum(TargetAudience).optional(),
    novelStyle: z.nativeEnum(NovelStyle).optional(),
    graphicalStyle: z.nativeEnum(GraphicalStyle).optional(),
    tone: z.string().trim().max(120).optional(),
  })
  .strict();

export const guideAnswerSchema = z.object({
  questionId: z.string().min(1).max(100),
  question: z.string().min(1).max(300),
  answer: z.string().trim().min(1).max(1500),
});

export const guideQuestionSchema = z
  .object({
    id: z.string().min(1).max(100),
    text: z.string().min(1).max(240),
    choices: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          label: z.string().min(1).max(100),
          value: z.string().min(1).max(500),
        }),
      )
      .min(3)
      .max(4),
    suggestedChoiceId: z.string().nullable(),
  })
  .refine(
    (q) =>
      new Set(q.choices.map((c) => c.id)).size === q.choices.length &&
      (q.suggestedChoiceId === null || q.choices.some((c) => c.id === q.suggestedChoiceId)),
  );

export const guideRequestSchema = z
  .object({
    templateId: z.string().min(1).max(80),
    templateVersion: z.number().int().positive(),
    guideSessionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    locale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']),
    mode: z.enum(['fiction', 'memory']),
    answers: z.array(guideAnswerSchema).max(STORY_GUIDE_LIMIT),
    previousQuestions: z.array(z.string().max(300)).max(STORY_GUIDE_LIMIT).default([]),
    preferences: storyPreferencesSchema.optional(),
    premise: z.string().max(4000).optional(),
    contribution: z.string().max(8000).optional(),
  })
  .strict();

const journeySchema = z.object({
  version: z.literal(1),
  sessionId: z.string().uuid(),
  templateId: z.string().nullable(),
  templateVersion: z.number().int().positive(),
  mode: z.enum(['fiction', 'memory']),
  premise: z.string().max(4000),
  preferences: storyPreferencesSchema,
  answers: z
    .array(
      guideAnswerSchema.extend({
        answer: z.string().max(1500),
        // Persisted UI provenance only; guideAnswerSchema strips it at the API boundary.
        isAuthorContribution: z.boolean().optional(),
      }),
    )
    .max(STORY_GUIDE_LIMIT),
  previousQuestions: z.array(z.string().max(300)).max(STORY_GUIDE_LIMIT),
  requests: z.number().int().min(0).max(STORY_GUIDE_LIMIT),
  question: guideQuestionSchema.nullable(),
  roundEnd: z.number().int().min(3).max(STORY_GUIDE_LIMIT),
  exhausted: z.boolean(),
});

export type StoryTemplateJourney = z.infer<typeof journeySchema>;

export function createTemplateJourney(template?: StoryTemplate): StoryTemplateJourney {
  return {
    version: 1,
    sessionId: crypto.randomUUID(),
    templateId: template?.id ?? null,
    templateVersion: template?.version ?? 1,
    mode: template?.defaultMode ?? 'fiction',
    premise: template?.premise ?? '',
    preferences: template
      ? {
          targetAudience: template.targetAudience,
          novelStyle: template.novelStyle,
          graphicalStyle: template.graphicalStyle,
          tone: template.tone,
        }
      : {},
    answers: [],
    previousQuestions: [],
    requests: 0,
    question: null,
    roundEnd: 3,
    exhausted: false,
  };
}

export function parseTemplateJourney(value: unknown): StoryTemplateJourney | null {
  const result = journeySchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Only confirmed answers join the generation brief. Pending suggestions never do. */
export function compileStoryBrief(
  journey: StoryTemplateJourney | null,
  contribution: string,
): string {
  if (!journey) return contribution.trim();
  const sections = [journey.premise.trim()];
  if (journey.mode === 'memory') {
    sections.push(
      'FACTUAL MEMORY: The premise is a narrative framework, not evidence of events. Use only supplied facts from the author or their media. Do not invent biographical events, relationships, dialogue, dates, or beliefs and present them as true. Omit unknown details.',
    );
  }
  if (journey.preferences.tone) sections.push(`Tone: ${journey.preferences.tone}`);
  for (const answer of journey.answers)
    if (answer.answer.trim()) sections.push(`${answer.question}\n${answer.answer.trim()}`);
  if (contribution.trim()) sections.push(`Author contribution:\n${contribution.trim()}`);
  return sections.filter(Boolean).join('\n\n');
}

export function fallbackQuestion(
  template: StoryTemplate,
  previous: string[],
  memory = false,
): StoryGuideQuestion | null {
  const q = template.fallbackQuestions.find((item) => !previous.includes(item.text));
  return q ? { ...q, suggestedChoiceId: memory ? null : q.suggestedChoiceId } : null;
}

export function canContinueTemplate(
  journey: StoryTemplateJourney | null,
  contribution: string,
  hasMedia: boolean,
): boolean {
  if (!journey) return true;
  const hasIdea =
    !!journey.premise.trim() || (!journey.templateId && (!!contribution.trim() || hasMedia));
  const hasAuthoredAnswer = journey.answers.some(
    (answer) => answer.isAuthorContribution === true && !!answer.answer.trim(),
  );
  return (
    hasIdea && (journey.mode !== 'memory' || !!contribution.trim() || hasMedia || hasAuthoredAnswer)
  );
}

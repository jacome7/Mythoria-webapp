import { z } from 'zod';
import {
  WRITING_PERSONA_POV_VALUES,
  WRITING_PERSONA_SPECIAL_REQUIREMENTS_MAX_LENGTH,
  WRITING_PERSONA_TECHNIQUE_VALUES,
} from '@/types/writing-persona';

const traitValueSchema = z.coerce.number().int().min(1).max(5);

export const writingPersonaSettingsSchema = z.object({
  pov: z.enum(WRITING_PERSONA_POV_VALUES),
  tone: traitValueSchema,
  formality: traitValueSchema,
  rhythm: traitValueSchema,
  vocabulary: traitValueSchema,
  fictionality: traitValueSchema,
  dialogueDensity: traitValueSchema,
  sensoriality: traitValueSchema,
  subtextIrony: traitValueSchema,
  techniques: z.array(z.enum(WRITING_PERSONA_TECHNIQUE_VALUES)).default([]),
  specialRequirements: z
    .string()
    .trim()
    .max(WRITING_PERSONA_SPECIAL_REQUIREMENTS_MAX_LENGTH)
    .default(''),
});

export const writingPersonaCreateSchema = writingPersonaSettingsSchema.extend({
  name: z.string().trim().min(1).max(120),
});

export const writingPersonaStorySchema = writingPersonaSettingsSchema.nullable();

export type ValidatedWritingPersonaSettings = z.infer<typeof writingPersonaSettingsSchema>;
export type ValidatedWritingPersonaCreate = z.infer<typeof writingPersonaCreateSchema>;

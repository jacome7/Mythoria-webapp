import { z } from 'zod';

const options = ['text', 'photo', 'audio', 'guide', 'template', 'document'] as const;
export const creationOption = z.enum(options);
const inputKinds = ['text', 'photo', 'audio', 'guide', 'document', 'template_answer'] as const;

export const creationObservation = z.object({
  draftRef: z.string().uuid().optional(),
  schemaVersion: z.literal(2),
  firstOption: z.enum([...options, 'no_observed_open', 'unknown']),
  entryKind: z.enum(['wizard', 'direct_template', 'legacy']),
  creationRoute: z.enum(['freeform', 'template', 'guide']),
  inputKinds: z.array(z.enum(inputKinds)).max(inputKinds.length),
  templateAnswerCount: z.number().int().min(0).max(100).optional(),
});

export type CreationObservation = z.infer<typeof creationObservation>;
export type CreationOption = (typeof options)[number];

export function buildCreationObservation(input: {
  draftRef?: string;
  firstOption: CreationObservation['firstOption'];
  entryKind: CreationObservation['entryKind'];
  text: boolean;
  document: boolean;
  photo: boolean;
  audio: boolean;
  guide: boolean;
  templateAnswerCount?: number;
}): CreationObservation {
  const { firstOption, entryKind, templateAnswerCount } = input;
  const inputKinds: CreationObservation['inputKinds'] = [];
  if (input.text) inputKinds.push('text');
  if (input.document) inputKinds.push('document');
  if (input.photo) inputKinds.push('photo');
  if (input.audio) inputKinds.push('audio');
  if (input.guide) inputKinds.push('guide');
  if (templateAnswerCount) inputKinds.push('template_answer');
  return {
    schemaVersion: 2,
    draftRef: input.draftRef,
    firstOption,
    entryKind,
    creationRoute: input.guide
      ? 'guide'
      : templateAnswerCount !== undefined
        ? 'template'
        : 'freeform',
    inputKinds,
    templateAnswerCount,
  };
}

import { z } from 'zod';
export const projectInput = z
  .object({
    locale: z.enum(['en-US', 'pt-PT', 'es-ES', 'fr-FR', 'de-DE']),
    title: z.string().max(200).default(''),
    subject: z.string().max(500).default(''),
    purpose: z.string().max(2000).default(''),
    consent: z.literal(true),
  })
  .strict();
export const projectPatch = projectInput.omit({ consent: true }).partial();
export const turnInput = z
  .object({
    id: z.uuid(),
    role: z.literal('user').default('user'),
    text: z.string().trim().min(1).max(40000),
    final: z.literal(true).default(true),
  })
  .strict();
export const turnPatch = z
  .object({
    text: z.string().trim().min(1).max(40000).optional(),
    included: z.boolean().optional(),
  })
  .strict();
export const segmentInput = z
  .object({
    id: z.uuid(),
    turnId: z.uuid(),
    sequence: z.number().int().min(0).max(100000),
    contentType: z.enum([
      'audio/pcm;rate=16000',
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ]),
    data: z
      .string()
      .min(1)
      .max(2800000)
      .regex(/^[A-Za-z0-9+/]*={0,2}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    durationMs: z.number().int().min(1).max(60000),
  })
  .strict();
export function biographerEnabled() {
  return process.env.BIOGRAPHER_ENABLED === 'true';
}

export function biographerCollaborationEnabled() {
  return biographerEnabled() && process.env.BIOGRAPHER_COLLABORATION_ENABLED === 'true';
}

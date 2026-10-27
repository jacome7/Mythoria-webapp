import { z } from 'zod';
import { parseTemplateJourney } from './journey';

const schema = z.object({
  owner: z.string(),
  storyId: z.string().uuid(),
  fingerprint: z.string(),
  completed: z.boolean(),
  jobId: z.string().optional(),
  structureRequestId: z.string().uuid().optional(),
  structurePayload: z.string().max(60_000).optional(),
  workflow: z.enum(['standard', 'experimental']).optional(),
});
export type Step2Submission = z.infer<typeof schema>;
const key = 'step2Submission';
const experimentalKey = 'experimentalStep2Submission';

export function readStep2Submission(owner: string, experimental = false): Step2Submission | null {
  try {
    // Preserve template submissions saved before the two workflows had separate storage.
    const legacyValue = sessionStorage.getItem(key);
    const legacy = schema.safeParse(legacyValue ? JSON.parse(legacyValue) : null);
    if (legacy.success && legacy.data.owner === owner && !legacy.data.workflow) {
      let journey = null;
      try {
        const journeyValue = sessionStorage.getItem('storyTemplateJourney');
        journey = journeyValue ? JSON.parse(journeyValue) : null;
      } catch {
        // A damaged optional journey must not hide a valid standard submission.
      }
      if (
        legacy.data.structureRequestId ||
        (journey?.owner === owner && parseTemplateJourney(journey.journey))
      ) {
        if (!sessionStorage.getItem(experimentalKey))
          sessionStorage.setItem(
            experimentalKey,
            JSON.stringify({ ...legacy.data, workflow: 'experimental' }),
          );
        sessionStorage.removeItem(key);
      }
    }
    const value = sessionStorage.getItem(experimental ? experimentalKey : key);
    const result = schema.safeParse(value ? JSON.parse(value) : null);
    if (!result.success || result.data.owner !== owner) return null;
    return result.data;
  } catch {
    return null;
  }
}

export function saveStep2Submission(value: Step2Submission, experimental = false): void {
  sessionStorage.setItem(
    experimental ? experimentalKey : key,
    JSON.stringify({
      ...value,
      workflow: experimental ? 'experimental' : 'standard',
    }),
  );
}

export async function storyInputFingerprint(value: unknown): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Upload paths move during structuring; that move is not a new user contribution. */
export function originalAudioPath(path: string | undefined): string | undefined {
  if (!path) return path;
  try {
    const raw = localStorage.getItem('step2RelocatedInputs');
    const relocation = raw ? JSON.parse(raw) : null;
    if (
      relocation?.audioPath &&
      path === `${relocation.storyId}/inputs/${relocation.audioPath.split('/').pop()}`
    )
      return relocation.audioPath;
  } catch {
    /* Ignore older relocation metadata. */
  }
  return path;
}

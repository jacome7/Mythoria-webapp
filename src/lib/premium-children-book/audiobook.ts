import { z } from 'zod';
import {
  premiumBookAssetSchema,
  premiumBookType,
  PremiumBookContractError,
  premiumRevisionPrefix,
  readPremiumBookMarker,
} from './contract';

const audiobookSchema = z.object({
  type: z.literal(premiumBookType),
  revision: z.uuid(),
  runId: z.uuid(),
  tracks: z
    .array(
      z.object({
        pageNumber: z.number().int().min(5).max(32),
        audio: premiumBookAssetSchema,
        duration: z.number().positive(),
      }),
    )
    .min(1)
    .max(28),
});

export function getPublishedPremiumRevision(features: unknown): string | undefined {
  try {
    const marker = readPremiumBookMarker(features);
    return marker?.state === 'published' ? marker.revision : undefined;
  } catch (error) {
    if (error instanceof PremiumBookContractError) return undefined;
    throw error;
  }
}

export function getCurrentPremiumAudiobook(storyId: string, features: unknown, uri: unknown) {
  const audio = audiobookSchema.safeParse(uri);
  const revision = getPublishedPremiumRevision(features);
  if (!audio.success || !revision || audio.data.revision !== revision) {
    return null;
  }
  const { data } = audio;
  const prefix = `${premiumRevisionPrefix(storyId, data.revision)}audiobooks/${data.runId}`;
  let previousPage = 0;
  for (const { audio: asset, pageNumber } of data.tracks) {
    if (
      pageNumber <= previousPage ||
      asset.key !== `${prefix}/page-${pageNumber}-${asset.sha256}.mp3`
    ) {
      return null;
    }
    previousPage = pageNumber;
  }
  return data;
}

export function getPremiumAudioMetadata(audio: ReturnType<typeof getCurrentPremiumAudiobook>) {
  if (!audio) return undefined;
  return {
    runId: audio.runId,
    tracks: audio.tracks.map(({ pageNumber, duration }) => ({ pageNumber, duration })),
  };
}

export function getPendingPremiumAudiobook(revision: string | undefined, uri: unknown) {
  const pending = z.object({ pendingRunId: z.uuid(), pendingRevision: z.uuid() }).safeParse(uri);
  return pending.success && revision === pending.data.pendingRevision
    ? pending.data.pendingRunId
    : undefined;
}

export type PremiumAudioMetadata = NonNullable<ReturnType<typeof getPremiumAudioMetadata>>;

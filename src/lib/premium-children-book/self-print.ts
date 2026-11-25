import { z } from 'zod';
import {
  premiumBookAssetSchema,
  premiumBookType,
  premiumRevisionPrefix,
  type PremiumBookMarker,
} from './contract';

const pendingPrefix = 'premium-self-print:v1:';

export interface PremiumSelfPrintPin {
  premiumBook: Extract<PremiumBookMarker, { state: 'published' }>;
  generateCMYK: boolean;
}

export function encodePremiumSelfPrintPin(storyId: string, pin: PremiumSelfPrintPin) {
  const { revision, manifest } = pin.premiumBook;
  if (manifest.key !== `${premiumRevisionPrefix(storyId, revision)}manifest.json`) {
    throw new Error('Invalid premium self-print manifest identity');
  }
  const ref =
    pendingPrefix +
    [
      revision,
      manifest.generation,
      manifest.sha256,
      manifest.bytes,
      pin.generateCMYK ? '1' : '0',
    ].join(':');
  if (ref.length > 255) throw new Error('Premium self-print pin exceeds queue reference capacity');
  return ref;
}

export function pendingPremiumSelfPrintPin(request: {
  status: string;
  queueReference?: string | null;
  storyId: string;
  authorId: string;
}): PremiumSelfPrintPin | undefined {
  const raw = request.queueReference;
  if (request.status !== 'pending' || !raw?.startsWith(pendingPrefix)) return undefined;
  const parts = raw.slice(pendingPrefix.length).split(':');
  const revision = z.string().uuid().parse(parts[0]);
  const manifest = premiumBookAssetSchema.parse({
    generation: parts[1],
    sha256: parts[2],
    bytes: Number(parts[3]),
    key: `${premiumRevisionPrefix(request.storyId, revision)}manifest.json`,
  });
  if (parts.length !== 5 || !['0', '1'].includes(parts[4] ?? '')) {
    throw new Error('Invalid pending premium self-print pin');
  }
  return {
    premiumBook: {
      version: 1,
      type: premiumBookType,
      state: 'published',
      revision,
      ownerId: request.authorId,
      manifest,
    },
    generateCMYK: parts[4] === '1',
  };
}

export function selfPrintExecutionReference(reference: string | null | undefined) {
  return reference && !reference.startsWith(pendingPrefix) ? reference : '';
}

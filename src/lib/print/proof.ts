import { Storage } from '@google-cloud/storage';
import { createHash } from 'node:crypto';
import { getEnvironmentConfig } from '@/config/environment';
import { z } from 'zod';
import {
  assetSchema,
  proofSchema,
  PrintError,
  type PrintAsset,
  type PrintBinding,
  type PrintProvider,
} from './contracts';
import type { PremiumSquareEdition } from './premium-edition';

const storage = new Storage();
type RenderInput = {
  storyId: string;
  orderId: string;
  runId: string;
  provider: PrintProvider;
  binding: PrintBinding;
  premiumBook?: PremiumSquareEdition['premiumBook'];
  premiumPageCount?: PremiumSquareEdition['pageCount'];
  podPackageId?: PremiumSquareEdition['podPackageId'];
};

export async function renderOrderProof(
  input: RenderInput,
  coverDimensions?: { width: number; height: number },
) {
  const config = getEnvironmentConfig();
  const response = await fetch(
    new URL('/internal/print/order-proof', config.storyGeneration.workflowUrl),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': config.storyGeneration.apiKey },
      body: JSON.stringify({ ...input, coverDimensions }),
      signal: AbortSignal.timeout(8 * 60_000),
    },
  );
  if (!response.ok) {
    throw new PrintError('proof_render_failed', 'The print proof could not be rendered.', 502);
  }
  const raw: unknown = await response.json();
  if (input.provider === 'lulu' && !coverDimensions) {
    return z.object({ interior: assetSchema, pageCount: z.number().int().positive() }).parse(raw);
  }
  return proofSchema.parse(raw);
}

export function assetFile(asset: PrintAsset, input: RenderInput, kind: 'interior' | 'cover') {
  const prefix = `print-orders/${input.orderId}/${input.runId}/${input.provider}/${input.binding}/${input.storyId}/`;
  if (
    !process.env.PRINT_PROOF_BUCKET ||
    asset.bucket !== process.env.PRINT_PROOF_BUCKET ||
    asset.object !== prefix + asset.sha256 + '/' + kind + '.pdf'
  ) {
    throw new PrintError(
      'invalid_proof_asset',
      'The proof file reference did not match this order.',
      500,
    );
  }
  return storage.bucket(asset.bucket).file(asset.object, { generation: asset.generation });
}

export async function verifyProofFile(
  asset: PrintAsset,
  input: RenderInput,
  kind: 'interior' | 'cover',
) {
  const file = assetFile(asset, input, kind);
  const hash = createHash('sha256');
  let size = 0;
  for await (const bytes of file.createReadStream()) {
    size += bytes.length;
    if (size > asset.size) break;
    hash.update(bytes);
  }
  if (size !== asset.size || hash.digest('hex') !== asset.sha256)
    throw new PrintError('invalid_proof_asset', 'The square proof PDF failed its integrity check.');
}

export async function ensureProofFileAvailable(
  asset: PrintAsset,
  input: RenderInput,
  kind: 'interior' | 'cover',
) {
  const [metadata] = await assetFile(asset, input, kind).getMetadata();
  if (String(metadata.generation) !== asset.generation || Number(metadata.size) !== asset.size)
    throw new PrintError('invalid_proof_asset', 'The current square proof PDF is unavailable.');
}

export async function signedProofLink(
  asset: PrintAsset,
  input: RenderInput,
  kind: 'interior' | 'cover',
  durationMs: number,
) {
  const [url] = await assetFile(asset, input, kind).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + durationMs,
    queryParams: { generation: asset.generation },
  });
  return url;
}

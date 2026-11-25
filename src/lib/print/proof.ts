import { Storage } from '@google-cloud/storage';
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

const storage = new Storage();
type RenderInput = {
  storyId: string;
  orderId: string;
  runId: string;
  provider: PrintProvider;
  binding: PrintBinding;
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

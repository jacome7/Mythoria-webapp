import { handle, id, owner } from '@/lib/biographer/http';
import { ownerReadContributorAsset } from '@/lib/biographer/collaboration';
export async function GET(
  _: Request,
  c: { params: Promise<{ projectId: string; participantId: string; assetId: string }> },
) {
  let result: Awaited<ReturnType<typeof ownerReadContributorAsset>> | undefined;
  const response = await handle(async () => {
    const a = await owner(true);
    const p = await c.params;
    result = await ownerReadContributorAsset(
      a.authorId,
      id(p.projectId),
      id(p.participantId),
      id(p.assetId),
      'photo',
    );
    return {};
  });
  if (!result) return response;
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const PATCH = (
  request: Request,
  context: { params: Promise<{ projectId: string; participantId: string; assetId: string }> },
) =>
  handle(async () => {
    const a = await owner();
    const p = await context.params;
    const { contributorDetail } = await import('@/lib/biographer/collaboration');
    const detail = await contributorDetail(a.authorId, id(p.projectId), id(p.participantId));
    if (!detail.assets.some((asset) => asset.id === id(p.assetId))) {
      const { BiographerError } = await import('@/db/services/biographer');
      throw new BiographerError('Photo not found', 404);
    }
    const { editPhoto } = await import('@/lib/biographer/storage');
    const { z } = await import('zod');
    const value = z
      .object({ included: z.boolean() })
      .strict()
      .parse(await request.json());
    return editPhoto(a.authorId, id(p.projectId), id(p.assetId), value);
  });

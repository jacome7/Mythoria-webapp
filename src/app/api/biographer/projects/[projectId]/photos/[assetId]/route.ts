import { handle, owner, id } from '@/lib/biographer/http';
import { readPhoto } from '@/lib/biographer/storage';
export async function GET(
  _: Request,
  c: { params: Promise<{ projectId: string; assetId: string }> },
) {
  let data: Awaited<ReturnType<typeof readPhoto>> | undefined;
  const error = await handle(async () => {
    const a = await owner(true);
    const p = await c.params;
    data = await readPhoto(a.authorId, id(p.projectId), id(p.assetId));
    return {};
  });
  if (!data) return error;
  return new Response(new Uint8Array(data.bytes), {
    headers: {
      'Content-Type': data.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export const PATCH = (r: Request, c: { params: Promise<{ projectId: string; assetId: string }> }) =>
  handle(async () => {
    const author = await owner();
    const params = await c.params;
    const { editPhoto } = await import('@/lib/biographer/storage');
    return editPhoto(author.authorId, id(params.projectId), id(params.assetId), await r.json());
  });

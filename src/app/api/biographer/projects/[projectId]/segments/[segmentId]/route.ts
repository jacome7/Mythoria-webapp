import { handle, owner, id } from '@/lib/biographer/http';
import { readSegment } from '@/lib/biographer/storage';
export async function GET(
  _: Request,
  c: { params: Promise<{ projectId: string; segmentId: string }> },
) {
  let result: Awaited<ReturnType<typeof readSegment>> | undefined;
  const error = await handle(async () => {
    const a = await owner(true);
    const p = await c.params;
    result = await readSegment(a.authorId, id(p.projectId), id(p.segmentId));
    return {};
  });
  if (!result) return error;
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      'Content-Type': result.segment.contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

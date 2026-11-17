import { handle, id, owner } from '@/lib/biographer/http';
import { ownerReadContributorAsset } from '@/lib/biographer/collaboration';
export async function GET(
  _: Request,
  c: { params: Promise<{ projectId: string; participantId: string; segmentId: string }> },
) {
  let result: Awaited<ReturnType<typeof ownerReadContributorAsset>> | undefined;
  const response = await handle(async () => {
    const a = await owner(true);
    const p = await c.params;
    result = await ownerReadContributorAsset(
      a.authorId,
      id(p.projectId),
      id(p.participantId),
      id(p.segmentId),
      'segment',
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

import { handle, id } from '@/lib/biographer/http';
import { guestReadAsset } from '@/lib/biographer/collaboration';
export async function GET(_: Request, c: { params: Promise<{ assetId: string }> }) {
  let result: Awaited<ReturnType<typeof guestReadAsset>> | undefined;
  const response = await handle(async () => {
    result = await guestReadAsset(id((await c.params).assetId), 'photo');
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

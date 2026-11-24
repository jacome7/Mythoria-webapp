import { z } from 'zod';
import { getCurrentAuthor } from '@/lib/auth';
import { getPublicPrintOptions } from '@/lib/print/checkout';
import { PrintError } from '@/lib/print/contracts';

export const dynamic = 'force-dynamic';

const headers = { 'cache-control': 'private, no-store' };

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('storyId');
  if (raw === null) return Response.json(await getPublicPrintOptions(), { headers });
  const storyId = z.uuid().safeParse(raw);
  if (!storyId.success) return Response.json({ error: 'Invalid story' }, { status: 400, headers });
  const author = await getCurrentAuthor();
  if (!author) return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    return Response.json(
      await getPublicPrintOptions({ storyId: storyId.data, authorId: author.authorId }),
      { headers },
    );
  } catch (error) {
    if (!(error instanceof PrintError)) throw error;
    return Response.json({ error: error.code }, { status: error.status, headers });
  }
}

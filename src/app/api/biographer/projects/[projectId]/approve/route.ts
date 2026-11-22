import { requireStandaloneBiography } from '@/lib/story-whisperer/server';
import { body, handle, owner, id } from '@/lib/biographer/http';
import { approve } from '@/lib/biographer/ai';
import { z } from 'zod';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const a = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    const p = z.object({ revision: z.number().int().nonnegative() }).parse(await body(r));
    return approve(a.authorId, projectId, p.revision);
  });

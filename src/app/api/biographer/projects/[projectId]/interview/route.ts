import { requireStandaloneBiography } from '@/lib/story-whisperer/server';
import { body, handle, owner, id } from '@/lib/biographer/http';
import { interview } from '@/lib/biographer/ai';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const author = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    return interview(author.authorId, projectId, await body(r));
  });

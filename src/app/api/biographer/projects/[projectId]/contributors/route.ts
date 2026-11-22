import { requireStandaloneBiography } from '@/lib/story-whisperer/server';
import { body, handle, id, owner } from '@/lib/biographer/http';
import { createInvitation, listContributors } from '@/lib/biographer/collaboration';
type Context = { params: Promise<{ projectId: string }> };
export const GET = (_: Request, c: Context) =>
  handle(async () =>
    listContributors((await owner(true)).authorId, id((await c.params).projectId)),
  );
export const POST = (r: Request, c: Context) =>
  handle(async () => {
    const author = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    return createInvitation(author.authorId, projectId, await body(r));
  });

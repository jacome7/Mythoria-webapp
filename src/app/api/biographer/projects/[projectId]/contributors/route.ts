import { body, handle, id, owner } from '@/lib/biographer/http';
import { createInvitation, listContributors } from '@/lib/biographer/collaboration';
type Context = { params: Promise<{ projectId: string }> };
export const GET = (_: Request, c: Context) =>
  handle(async () =>
    listContributors((await owner(true)).authorId, id((await c.params).projectId)),
  );
export const POST = (r: Request, c: Context) =>
  handle(async () =>
    createInvitation((await owner()).authorId, id((await c.params).projectId), await body(r)),
  );

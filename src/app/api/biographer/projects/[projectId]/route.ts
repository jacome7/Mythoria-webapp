import { body, handle, owner, id } from '@/lib/biographer/http';
import { detail, updateProject } from '@/db/services/biographer';
type Context = { params: Promise<{ projectId: string }> };
export const GET = (_: Request, c: Context) =>
  handle(async () => detail((await owner(true)).authorId, id((await c.params).projectId)));
export const PATCH = (r: Request, c: Context) =>
  handle(async () =>
    updateProject((await owner()).authorId, id((await c.params).projectId), await body(r)),
  );
export const DELETE = (_: Request, c: Context) =>
  handle(async () => {
    const a = await owner(true);
    const { deleteProject } = await import('@/lib/biographer/storage');
    return deleteProject(a.authorId, id((await c.params).projectId));
  });

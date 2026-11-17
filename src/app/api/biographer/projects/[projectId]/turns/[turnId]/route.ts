import { body, handle, owner, id } from '@/lib/biographer/http';
import { editTurn } from '@/db/services/biographer';
export const PATCH = (r: Request, c: { params: Promise<{ projectId: string; turnId: string }> }) =>
  handle(async () => {
    const author = await owner();
    const p = await c.params;
    return editTurn(author.authorId, id(p.projectId), id(p.turnId), await body(r));
  });

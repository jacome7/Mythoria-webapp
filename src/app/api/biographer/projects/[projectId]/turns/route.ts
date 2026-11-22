import { body, handle, owner, id } from '@/lib/biographer/http';
import { saveTurn } from '@/db/services/biographer';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => ({
    turn: await saveTurn((await owner()).authorId, id((await c.params).projectId), await body(r)),
  }));

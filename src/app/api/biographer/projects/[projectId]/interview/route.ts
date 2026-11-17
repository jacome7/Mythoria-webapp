import { body, handle, owner, id } from '@/lib/biographer/http';
import { interview } from '@/lib/biographer/ai';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () =>
    interview((await owner()).authorId, id((await c.params).projectId), await body(r)),
  );

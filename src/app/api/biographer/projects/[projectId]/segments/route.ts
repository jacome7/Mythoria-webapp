import { body, handle, owner, id } from '@/lib/biographer/http';
import { saveSegment } from '@/lib/biographer/storage';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () =>
    saveSegment((await owner()).authorId, id((await c.params).projectId), await body(r)),
  );

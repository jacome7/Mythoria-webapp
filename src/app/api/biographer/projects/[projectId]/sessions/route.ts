import { handle, owner, id } from '@/lib/biographer/http';
import { issueSession } from '@/db/services/biographer';
export const POST = (_: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => issueSession((await owner()).authorId, id((await c.params).projectId)));

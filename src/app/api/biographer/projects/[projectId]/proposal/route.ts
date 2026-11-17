import { body, handle, owner, id } from '@/lib/biographer/http';
import { proposal } from '@/lib/biographer/ai';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () =>
    proposal((await owner()).authorId, id((await c.params).projectId), await body(r)),
  );

export const PATCH = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const a = await owner();
    const { editProposal } = await import('@/lib/biographer/ai');
    return editProposal(a.authorId, id((await c.params).projectId), await body(r));
  });

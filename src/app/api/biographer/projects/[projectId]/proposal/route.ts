import { requireStandaloneBiography } from '@/lib/story-whisperer/server';
import { body, handle, owner, id } from '@/lib/biographer/http';
import { proposal } from '@/lib/biographer/ai';
export const POST = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const author = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    return proposal(author.authorId, projectId, await body(r));
  });

export const PATCH = (r: Request, c: { params: Promise<{ projectId: string }> }) =>
  handle(async () => {
    const a = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    const { editProposal } = await import('@/lib/biographer/ai');
    return editProposal(a.authorId, projectId, await body(r));
  });

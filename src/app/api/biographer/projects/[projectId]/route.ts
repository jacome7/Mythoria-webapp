import { body, handle, owner, id } from '@/lib/biographer/http';
import { detail, updateProject } from '@/db/services/biographer';
import { requireStandaloneBiography } from '@/lib/story-whisperer/server';

type Context = { params: Promise<{ projectId: string }> };

export const GET = (_: Request, c: Context) =>
  handle(async () => {
    const author = await owner(true);
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    return detail(author.authorId, projectId);
  });

export const PATCH = (r: Request, c: Context) =>
  handle(async () => {
    const author = await owner();
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    return updateProject(author.authorId, projectId, await body(r));
  });

export const DELETE = (_: Request, c: Context) =>
  handle(async () => {
    const author = await owner(true);
    const projectId = id((await c.params).projectId);
    await requireStandaloneBiography(projectId);
    const { deleteProject } = await import('@/lib/biographer/storage');
    return deleteProject(author.authorId, projectId);
  });

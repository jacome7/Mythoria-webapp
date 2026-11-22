import { body, handle, owner } from '@/lib/biographer/http';
import { createProject, listProjects } from '@/db/services/biographer';
export const GET = () =>
  handle(async () => {
    const author = await owner(true);
    return { projects: await listProjects(author.authorId) };
  });
export const POST = (request: Request) =>
  handle(async () => {
    const author = await owner();
    return createProject(author.authorId, author.displayName, await body(request));
  });

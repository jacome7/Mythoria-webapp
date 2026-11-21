import { expectedWhispererProject } from '@/lib/story-whisperer/http';
import { body, handle, id, owner } from '@/lib/biographer/http';
import { getWhisperer, resetWhisperer, startWhisperer } from '@/lib/story-whisperer/server';

type Context = { params: Promise<{ draftId: string }> };

export const GET = (_: Request, context: Context) =>
  handle(async () => getWhisperer((await owner()).authorId, id((await context.params).draftId)));

export const POST = (request: Request, context: Context) =>
  handle(async () => {
    const author = await owner();
    return startWhisperer(
      author.authorId,
      author.displayName,
      id((await context.params).draftId),
      await body(request),
      expectedWhispererProject(request, false),
    );
  });

export const DELETE = (request: Request, context: Context) =>
  handle(async () =>
    resetWhisperer(
      (await owner(true)).authorId,
      id((await context.params).draftId),
      id(new URL(request.url).searchParams.get('projectId') ?? ''),
    ),
  );

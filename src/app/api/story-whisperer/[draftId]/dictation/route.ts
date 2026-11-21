import { expectedWhispererProject } from '@/lib/story-whisperer/http';
import { body, handle, id, owner } from '@/lib/biographer/http';
import { dictateWhisperer } from '@/lib/story-whisperer/server';

type Context = { params: Promise<{ draftId: string }> };

export const POST = (request: Request, context: Context) =>
  handle(async () =>
    dictateWhisperer(
      (await owner()).authorId,
      id((await context.params).draftId),
      expectedWhispererProject(request),
      await body(request),
    ),
  );

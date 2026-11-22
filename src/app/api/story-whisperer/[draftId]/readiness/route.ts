import { expectedWhispererProject } from '@/lib/story-whisperer/http';
import { handle, id, owner } from '@/lib/biographer/http';
import { refreshWhispererReadiness } from '@/lib/story-whisperer/server';

type Context = { params: Promise<{ draftId: string }> };

export const POST = (request: Request, context: Context) =>
  handle(async () =>
    refreshWhispererReadiness(
      (await owner()).authorId,
      id((await context.params).draftId),
      expectedWhispererProject(request),
    ),
  );

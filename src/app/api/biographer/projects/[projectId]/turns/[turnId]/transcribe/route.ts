import { handle, owner, id } from '@/lib/biographer/http';
import { recoverTranscription } from '@/lib/biographer/transcription';
export const POST = (_: Request, c: { params: Promise<{ projectId: string; turnId: string }> }) =>
  handle(async () => {
    const author = await owner();
    const params = await c.params;
    return recoverTranscription(author.authorId, id(params.projectId), id(params.turnId));
  });

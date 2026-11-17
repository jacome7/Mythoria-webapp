import { handle, id } from '@/lib/biographer/http';
import { guestSession, requireGuestOrigin } from '@/lib/biographer/collaboration';
import { recoverTranscription } from '@/lib/biographer/transcription';
export const POST = (r: Request, c: { params: Promise<{ turnId: string }> }) =>
  handle(async () => {
    requireGuestOrigin(r);
    const { project, participant } = await guestSession();
    return recoverTranscription(project.authorId, project.id, id((await c.params).turnId), {
      participantId: participant.id,
      accessVersion: participant.accessVersion,
    });
  });

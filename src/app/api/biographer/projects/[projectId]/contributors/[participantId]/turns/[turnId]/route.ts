import { body, handle, id, owner } from '@/lib/biographer/http';
import { ownerEditContribution } from '@/lib/biographer/collaboration';
export const PATCH = (
  r: Request,
  c: { params: Promise<{ projectId: string; participantId: string; turnId: string }> },
) =>
  handle(async () => {
    const a = await owner();
    const p = await c.params;
    return ownerEditContribution(
      a.authorId,
      id(p.projectId),
      id(p.participantId),
      id(p.turnId),
      await body(r),
    );
  });

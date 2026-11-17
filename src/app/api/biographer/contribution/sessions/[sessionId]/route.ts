import { handle, id } from '@/lib/biographer/http';
import { guestStopSession, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const PATCH = (r: Request, c: { params: Promise<{ sessionId: string }> }) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestStopSession(id((await c.params).sessionId));
  });

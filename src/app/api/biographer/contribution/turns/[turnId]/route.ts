import { handle, body, id } from '@/lib/biographer/http';
import { guestEditTurn, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const PATCH = (r: Request, c: { params: Promise<{ turnId: string }> }) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestEditTurn(id((await c.params).turnId), await body(r));
  });

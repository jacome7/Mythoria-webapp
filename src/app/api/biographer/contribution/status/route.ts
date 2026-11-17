import { handle, body } from '@/lib/biographer/http';
import { guestSetStatus, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestSetStatus(await body(r));
  });

import { handle, body } from '@/lib/biographer/http';
import { guestInterview, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestInterview(await body(r));
  });

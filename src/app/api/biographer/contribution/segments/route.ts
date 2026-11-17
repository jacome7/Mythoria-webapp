import { handle, body } from '@/lib/biographer/http';
import { guestSaveSegment, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestSaveSegment(await body(r));
  });

import { body, handle } from '@/lib/biographer/http';
import { guestSaveTurn } from '@/lib/biographer/collaboration';
import { requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestSaveTurn(await body(r));
  });

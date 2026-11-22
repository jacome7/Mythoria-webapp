import { handle } from '@/lib/biographer/http';
import { guestIssueSession, requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return guestIssueSession();
  });

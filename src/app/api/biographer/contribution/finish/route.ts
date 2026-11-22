import { handle } from '@/lib/biographer/http';
import { finishContribution } from '@/lib/biographer/collaboration';
import { requireGuestOrigin } from '@/lib/biographer/collaboration';
export const POST = (r: Request) =>
  handle(async () => {
    requireGuestOrigin(r);
    return finishContribution();
  });

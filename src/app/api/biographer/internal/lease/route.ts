import { body, handle, internal } from '@/lib/biographer/http';
import { leaseSession } from '@/db/services/biographer';
import { z } from 'zod';
export const POST = (r: Request) =>
  handle(async () => {
    internal(r);
    const p = z
      .object({
        sessionId: z.uuid(),
        leaseId: z.uuid(),
        action: z.enum(['heartbeat', 'release', 'discard']),
        turnIds: z.array(z.uuid()).max(4).optional(),
      })
      .strict()
      .refine((value) => (value.action === 'discard') === Boolean(value.turnIds))
      .parse(await body(r));
    return leaseSession(p.sessionId, p.leaseId, p.action !== 'heartbeat', p.turnIds);
  });

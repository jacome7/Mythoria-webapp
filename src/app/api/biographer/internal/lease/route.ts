import { body, handle, internal } from '@/lib/biographer/http';
import { leaseSession } from '@/db/services/biographer';
import { z } from 'zod';
export const POST = (r: Request) =>
  handle(async () => {
    internal(r);
    const p = z
      .object({ sessionId: z.uuid(), leaseId: z.uuid(), action: z.enum(['heartbeat', 'release']) })
      .strict()
      .parse(await body(r));
    return leaseSession(p.sessionId, p.leaseId, p.action === 'release');
  });

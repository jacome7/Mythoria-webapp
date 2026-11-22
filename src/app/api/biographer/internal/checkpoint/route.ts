import { body, handle, internal } from '@/lib/biographer/http';
import { checkpoint } from '@/db/services/biographer';
import { z } from 'zod';
export const POST = (r: Request) =>
  handle(async () => {
    internal(r);
    return checkpoint(
      z
        .object({
          sessionId: z.uuid(),
          eventId: z.uuid(),
          turnId: z.uuid(),
          role: z.enum(['user', 'assistant']),
          text: z.string().max(40000),
          final: z.boolean().optional(),
          interrupted: z.boolean().optional(),
        })
        .strict()
        .parse(await body(r)),
    );
  });

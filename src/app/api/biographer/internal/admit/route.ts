import { body, handle, internal } from '@/lib/biographer/http';
import { admitSession, BiographerError } from '@/db/services/biographer';
import { z } from 'zod';
import { biographerEnabled } from '@/lib/biographer/validation';
export const POST = (r: Request) =>
  handle(async () => {
    internal(r);
    if (!biographerEnabled()) throw new BiographerError('Not found', 404);
    const p = z
      .object({
        ticket: z.string().min(32).max(100),
        projectId: z.uuid(),
        sessionId: z.uuid(),
        origin: z.string(),
      })
      .parse(await body(r));
    const origins = (process.env.BIOGRAPHER_ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    if (!origins.includes(p.origin)) throw new BiographerError('Origin denied', 403);
    return admitSession(p.ticket, p.projectId, p.sessionId);
  });

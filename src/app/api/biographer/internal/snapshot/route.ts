import { body, handle, internal } from '@/lib/biographer/http';
import { db } from '@/db';
import { biographerBookVersions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
export const POST = (r: Request) =>
  handle(async () => {
    internal(r);
    const p = z.object({ storyId: z.uuid() }).parse(await body(r));
    const [version] = await db
      .select()
      .from(biographerBookVersions)
      .where(eq(biographerBookVersions.storyId, p.storyId));
    return version?.snapshot ?? null;
  });

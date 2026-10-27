import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { isStoryTemplatesEnabled, isStoryTemplatesEnabledForAuthor } from './feature';

/** Request-scoped read only: public pages must not create authors or update login timestamps. */
export async function getStoryTemplateAccess(): Promise<boolean> {
  if (!isStoryTemplatesEnabled()) return false;
  try {
    const { userId } = await auth();
    if (!userId) return false;
    const [author] = await db
      .select({ experimentalFeaturesEnabled: authors.experimentalFeaturesEnabled })
      .from(authors)
      .where(and(eq(authors.clerkUserId, userId), isNull(authors.accountClosedAt)))
      .limit(1);
    return isStoryTemplatesEnabledForAuthor(author);
  } catch {
    // Public content and the standard workflow remain available when eligibility cannot be read.
    return false;
  }
}

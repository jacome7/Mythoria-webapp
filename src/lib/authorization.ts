import { storyService } from '@/db/services';
import { db } from '@/db';
import { storyCollaborators } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export class AccessDeniedError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AccessDeniedError';
  }
}

/**
 * Ensures the requesting author can access the story by ID (private ID-based route policy).
 * Only the owner (authorId match) or a collaborator (future enhancement) may access.
 * Stories being published or public does NOT grant access through ID endpoints.
 * Throws AccessDeniedError if not permitted or story absent.
 */
export async function ensureStoryIdAccess(storyId: string, requesterAuthorId: string) {
  const story = await storyService.getStoryById(storyId);
  if (!story) {
    throw new AccessDeniedError(); // Obscure existence
  }
  if (story.authorId === requesterAuthorId) return story;

  // Check collaborator access (editor or viewer)
  const collab = await db.select({ userId: storyCollaborators.userId })
    .from(storyCollaborators)
    .where(and(eq(storyCollaborators.storyId, storyId), eq(storyCollaborators.userId, requesterAuthorId)))
    .limit(1);
  if (collab.length) return story;

  throw new AccessDeniedError();
}

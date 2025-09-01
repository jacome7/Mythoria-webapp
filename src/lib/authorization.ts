import { storyService } from '@/db/services';

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
  // TODO: when collaborator logic exists, check here (e.g., storyService.isCollaborator)
  throw new AccessDeniedError();
}

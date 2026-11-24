import { chapterService, storyService } from '@/db/services';
import { McpToolUserError } from './tool-result';

export type StoryRecord = NonNullable<Awaited<ReturnType<typeof storyService.getStoryById>>>;

export type StoryChapterRecord = Awaited<
  ReturnType<typeof chapterService.getStoryChapters>
>[number];

export function ensureStoryOwnership(
  story: Awaited<ReturnType<typeof storyService.getStoryById>>,
  authorId: string,
): StoryRecord {
  if (!story || story.authorId !== authorId) {
    throw new McpToolUserError('Story not found or access denied.');
  }
  return story;
}

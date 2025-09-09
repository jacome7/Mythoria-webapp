import type { StoryData } from "@/types/story";

export async function fetchStoryData(storyId: string): Promise<StoryData> {
  const response = await fetch(`/api/my-stories/${storyId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch story data");
  }
  const data = await response.json();
  return data.story as StoryData;
}

import GetInspiredPageClient, { type FeaturedStory } from './GetInspiredPageClient';
import { storyService } from '@/db/services';

export default async function GetInspiredPage() {
  const stories = await storyService.getFeaturedPublicStories();
  const initialStories: FeaturedStory[] = stories.map((story) => ({
    storyId: story.storyId,
    title: story.title,
    slug: story.slug!,
    featureImageUri: story.featureImageUri,
    author: story.author,
    createdAt: story.createdAt.toISOString(),
    targetAudience: story.targetAudience ?? undefined,
    graphicalStyle: story.graphicalStyle ?? undefined,
    storyLanguage: story.storyLanguage,
    averageRating: story.averageRating,
    ratingCount: story.ratingCount,
  }));

  return <GetInspiredPageClient initialStories={initialStories} />;
}

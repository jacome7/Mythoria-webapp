import { NextResponse } from 'next/server';
import { getCurrentAuthor } from '@/lib/auth';
import { storyService } from '@/db/services';
import {
  hasPremiumBookMarker,
  premiumBookType,
  storyFeatureRecord,
} from '@/lib/premium-children-book/contract';
import {
  getCurrentPremiumAudiobook,
  getPublishedPremiumRevision,
} from '@/lib/premium-children-book/audiobook';
import { premiumBookImagePath } from '@/lib/premium-children-book/reader';
import { getPurchasableSquareSupplier } from '@/lib/print/checkout';

export async function GET() {
  try {
    const author = await getCurrentAuthor();

    if (!author) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stories = await storyService.getStoriesByAuthor(author.authorId);
    const canPrintPremium =
      stories.some(
        (story) => story.status === 'published' && hasPremiumBookMarker(story.features),
      ) && Boolean(await getPurchasableSquareSupplier().catch(() => null));
    // Exclude 'temporary' stories from the listing
    const filtered = stories
      .filter((s) => s.status !== 'temporary')
      .map((story) => {
        if (!hasPremiumBookMarker(story.features)) return story;
        const published = story.status === 'published';
        const canNarrate = published && Boolean(getPublishedPremiumRevision(story.features));
        return {
          storyId: story.storyId,
          title: story.title,
          status: story.status,
          storyGenerationStatus: story.storyGenerationStatus,
          storyGenerationCompletedPercentage: story.storyGenerationCompletedPercentage,
          isPublic: story.isPublic,
          slug: story.slug,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          bookType: premiumBookType,
          coverUri: published ? premiumBookImagePath(story.storyId, 'front') : null,
          premiumPrintAvailable:
            published &&
            canPrintPremium &&
            storyFeatureRecord(storyFeatureRecord(story.features).premiumBook).readingProof !==
              true,
          premiumAudiobookAvailable: canNarrate,
          hasAudio:
            canNarrate &&
            Boolean(getCurrentPremiumAudiobook(story.storyId, story.features, story.audiobookUri)),
        };
      });
    return NextResponse.json({ stories: filtered });
  } catch (error) {
    console.error('Error fetching user stories:', error);
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

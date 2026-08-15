import { config } from 'dotenv';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../src/db';
import { chapters, stories } from '../src/db/schema';
import { storyService } from '../src/db/services';

config({ path: '.env.local', quiet: true });

const COVER_STORY_ID = '546a9273-2382-4ef8-9aa9-cfb217c43f6d';
const SYNOPSIS_STORY_ID = '487dc772-5e89-4583-9052-bb9011627006';

async function main() {
  if (!process.argv.includes('--apply')) {
    throw new Error('Refusing to write without --apply');
  }

  const result = await db.transaction(async (tx) => {
    const [coverStory] = await tx
      .select({ coverUri: stories.coverUri })
      .from(stories)
      .where(eq(stories.storyId, COVER_STORY_ID))
      .limit(1);
    const [coverSource] = coverStory?.coverUri
      ? [{ imageUri: coverStory.coverUri }]
      : await tx
          .select({ imageUri: chapters.imageUri })
          .from(chapters)
          .where(eq(chapters.storyId, COVER_STORY_ID))
          .orderBy(asc(chapters.chapterNumber))
          .limit(1);
    if (!coverSource?.imageUri?.trim()) throw new Error('Verified cover fallback is unavailable');

    const [synopsisSource] = await tx
      .select({ plotDescription: stories.plotDescription })
      .from(stories)
      .where(and(eq(stories.storyId, SYNOPSIS_STORY_ID), isNull(stories.synopsis)))
      .limit(1);
    const [synopsisStory] = await tx
      .select({ synopsis: stories.synopsis })
      .from(stories)
      .where(eq(stories.storyId, SYNOPSIS_STORY_ID))
      .limit(1);
    if (!synopsisStory?.synopsis?.trim() && !synopsisSource?.plotDescription?.trim()) {
      throw new Error('Verified synopsis fallback is unavailable');
    }

    const coverUpdated = await tx
      .update(stories)
      .set({ coverUri: coverSource.imageUri, updatedAt: new Date() })
      .where(and(eq(stories.storyId, COVER_STORY_ID), isNull(stories.coverUri)))
      .returning({ storyId: stories.storyId });
    const synopsisUpdated = await tx
      .update(stories)
      .set({ synopsis: synopsisSource?.plotDescription, updatedAt: new Date() })
      .where(and(eq(stories.storyId, SYNOPSIS_STORY_ID), isNull(stories.synopsis)))
      .returning({ storyId: stories.storyId });

    return {
      coverUpdated: coverUpdated.length,
      synopsisUpdated: synopsisUpdated.length,
    };
  });

  const remainingInvalid = await storyService.auditPublicStoryIndexability();
  console.log(
    JSON.stringify({ ok: remainingInvalid.length === 0, result, remainingInvalid }, null, 2),
  );
  if (remainingInvalid.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

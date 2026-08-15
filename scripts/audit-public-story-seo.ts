import { config } from 'dotenv';
import { chapterService, storyService } from '../src/db/services';
import { validatePublicStoryIndexability } from '../src/lib/story-seo';

config({ path: '.env.local', quiet: true });

const SEARCH_CONSOLE_SLUGS = [
  'how-i-met-your-mother',
  'juventude-de-gaia-no-mundial-de-clubes',
  'joo-e-a-sua-imaginao',
] as const;

async function main() {
  const [invalidPublicStories, affectedStories] = await Promise.all([
    storyService.auditPublicStoryIndexability(),
    Promise.all(
      SEARCH_CONSOLE_SLUGS.map(async (slug) => {
        const story = await storyService.getPublicStorySeoData(slug);
        return {
          slug,
          found: Boolean(story),
          ...(story
            ? {
                storyId: story.storyId,
                status: story.status,
                storyLanguage: story.storyLanguage,
                titlePresent: Boolean(story.title?.trim()),
                synopsisPresent: Boolean(story.synopsis?.trim()),
                coverPresent: Boolean(story.coverUri?.trim()),
                meaningfulChapterPresent: story.hasMeaningfulContent,
                validation: validatePublicStoryIndexability(story),
              }
            : {}),
        };
      }),
    ),
  ]);

  const repairCandidates = await Promise.all(
    invalidPublicStories.map(async (invalid) => {
      const story = invalid.slug ? await storyService.getStoryBySlug(invalid.slug) : undefined;
      const chapters = story ? await chapterService.getStoryChapters(story.storyId) : [];
      return {
        storyId: invalid.storyId,
        slug: invalid.slug,
        plotDescriptionPresent: Boolean(story?.plotDescription?.trim()),
        featureImagePresent: Boolean(story?.featureImageUri?.trim()),
        backcoverPresent: Boolean(story?.backcoverUri?.trim()),
        chapterImagePresent: chapters.some((chapter) => Boolean(chapter.imageUri?.trim())),
      };
    }),
  );

  console.log(
    JSON.stringify(
      {
        ok: invalidPublicStories.length === 0 && affectedStories.every((story) => story.found),
        affectedStories,
        invalidPublicStoryCount: invalidPublicStories.length,
        invalidPublicStories,
        repairCandidates,
      },
      null,
      2,
    ),
  );

  if (invalidPublicStories.length > 0 || affectedStories.some((story) => !story.found)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { chapterService, storyService } from '@/db/services';
import {
  APP_BASE_URL,
  resolveStoryApiUrl,
  resolveStoryAudioPreviewUrl,
  resolveStoryWebUrl,
} from './app-links';
import type { McpAuthContext } from './auth';
import { getDiscoveryCopy } from './discovery-copy';
import { executeTool } from './tool-execution';
import { resolveLocale, stripHtml, truncateText } from './tool-input';
import { TOOL_NAMES } from './tool-metadata';
import { toJsonContent } from './tool-result';

type FeaturedStory = Awaited<ReturnType<typeof storyService.getFeaturedPublicStories>>[number];

export function registerDiscoveryTools(server: McpServer, authContext: McpAuthContext) {
  server.registerTool(
    TOOL_NAMES.discoveryPing,
    {
      description:
        'Use this when you need to confirm the Mythoria MCP endpoint is reachable before calling any other tool.',
      annotations: {
        readOnlyHint: true,
      },
    },
    async () =>
      executeTool(TOOL_NAMES.discoveryPing, authContext, undefined, async () => ({
        content: [
          {
            type: 'text',
            text: 'ok',
          },
        ],
      })),
  );

  const discoveryInput = z
    .object({
      locale: z
        .string()
        .optional()
        .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    })
    .optional();

  const featuredStoriesInput = z
    .object({
      locale: z
        .string()
        .optional()
        .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe('Maximum number of stories to return. Defaults to 6.'),
      targetAudience: z.string().optional().describe('Optional audience filter.'),
      graphicalStyle: z.string().optional().describe('Optional graphical style filter.'),
    })
    .optional();

  server.registerTool(
    TOOL_NAMES.discoveryCapabilities,
    {
      description:
        'Use this when users ask for story creation help and you need a concise Mythoria capability summary.',
      inputSchema: discoveryInput,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof discoveryInput>) =>
      executeTool(TOOL_NAMES.discoveryCapabilities, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input?.locale);
        const copy = getDiscoveryCopy(resolvedLocale);

        return toJsonContent({
          locale: resolvedLocale,
          app: {
            id: 'mythoria',
            name: 'Mythoria',
            tagline: copy.tagline,
          },
          supportedWorkflows: [
            'Create a custom story from a user idea',
            'Read a published story',
            'Listen to a story audiobook',
            'Get story-writing tips and Mythoria guidance',
          ],
          suggestedUserPrompts: [
            'Create a story about two sisters and a dragon.',
            'Create a bedtime story for a 6-year-old about sharing.',
            'Help me improve a story draft and make it more magical.',
          ],
          links: {
            home: `${APP_BASE_URL}/${resolvedLocale}`,
            featuredStories: `${APP_BASE_URL}/${resolvedLocale}/getInspired`,
          },
          guidance: copy.discoveryGuidance,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.discoveryFeaturedStories,
    {
      description:
        'Use this when you want to show curated public Mythoria stories before asking users to create a new one.',
      inputSchema: featuredStoriesInput,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof featuredStoriesInput>) =>
      executeTool(TOOL_NAMES.discoveryFeaturedStories, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input?.locale);
        const storiesByLocale = await storyService.getFeaturedPublicStories({
          storyLanguage: resolvedLocale,
          targetAudience: input?.targetAudience,
          graphicalStyle: input?.graphicalStyle,
        });
        const stories =
          storiesByLocale.length > 0
            ? storiesByLocale
            : await storyService.getFeaturedPublicStories({
                targetAudience: input?.targetAudience,
                graphicalStyle: input?.graphicalStyle,
              });
        const limit = input?.limit ?? 6;
        const copy = getDiscoveryCopy(resolvedLocale);

        return toJsonContent({
          locale: resolvedLocale,
          total: stories.length,
          stories: stories.slice(0, limit).map((story: FeaturedStory) => ({
            id: story.storyId,
            title: story.title,
            author: story.author,
            slug: story.slug,
            targetAudience: story.targetAudience,
            graphicalStyle: story.graphicalStyle,
            language: story.storyLanguage,
            averageRating: story.averageRating,
            ratingCount: story.ratingCount,
            featureImageUri: story.featureImageUri,
            readUrl: story.slug ? resolveStoryWebUrl(resolvedLocale, story.slug) : null,
            apiUrl: story.slug ? resolveStoryApiUrl(story.slug) : null,
          })),
          guidance: copy.discoveryGuidance,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.discoverySampleStoryPreview,
    {
      description:
        'Use this when an anonymous user asks for a sample. Returns a curated low-cost preview with image and links.',
      inputSchema: featuredStoriesInput,
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof featuredStoriesInput>) =>
      executeTool(TOOL_NAMES.discoverySampleStoryPreview, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input?.locale);
        const copy = getDiscoveryCopy(resolvedLocale);
        const storiesByLocale = await storyService.getFeaturedPublicStories({
          storyLanguage: resolvedLocale,
          targetAudience: input?.targetAudience,
          graphicalStyle: input?.graphicalStyle,
        });
        const stories =
          storiesByLocale.length > 0
            ? storiesByLocale
            : await storyService.getFeaturedPublicStories({
                targetAudience: input?.targetAudience,
                graphicalStyle: input?.graphicalStyle,
              });
        const selectedStory = stories.find((story) => Boolean(story.slug)) ?? null;

        if (!selectedStory || !selectedStory.slug) {
          return toJsonContent({
            locale: resolvedLocale,
            available: false,
            reason: copy.sampleUnavailable,
            guidance: copy.discoveryGuidance,
          });
        }

        const [storyDetails, firstChapter] = await Promise.all([
          storyService.getStoryById(selectedStory.storyId),
          chapterService.getStoryChapter(selectedStory.storyId, 1),
        ]);
        const excerptSource = firstChapter?.htmlContent
          ? stripHtml(firstChapter.htmlContent)
          : storyDetails?.synopsis || selectedStory.title;

        return toJsonContent({
          locale: resolvedLocale,
          available: true,
          mode: 'curated_pre_generated',
          sample: {
            id: selectedStory.storyId,
            title: selectedStory.title,
            author: selectedStory.author,
            language: selectedStory.storyLanguage,
            targetAudience: selectedStory.targetAudience,
            graphicalStyle: selectedStory.graphicalStyle,
            excerpt: truncateText(excerptSource, 600),
            featureImageUri:
              firstChapter?.imageUri ||
              storyDetails?.coverUri ||
              storyDetails?.featureImageUri ||
              selectedStory.featureImageUri,
            readUrl: resolveStoryWebUrl(resolvedLocale, selectedStory.slug),
            apiUrl: resolveStoryApiUrl(selectedStory.slug),
            audioPreviewUrl: firstChapter?.audioUri
              ? resolveStoryAudioPreviewUrl(selectedStory.slug)
              : null,
          },
          generationExpectations: {
            expectedWaitSeconds: 300,
            note: copy.sampleHint,
          },
          guidance: copy.discoveryGuidance,
        });
      }),
  );
}

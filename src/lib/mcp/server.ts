import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

import { DEFAULT_CURRENCY } from '@/config/currency';
import { SUPPORTED_LOCALES } from '@/config/locales';
import { creditPackagesService, creditService, faqService, paymentService, storyService } from '@/db/services';
import crypto from 'crypto';

import { McpAuthError, type McpAuthContext, resolveMcpAuthContext, requireAuthor } from './auth';

const MCP_SERVER_INFO = {
  name: 'mythoria-mcp',
  version: '0.1.0',
  description: 'Model Context Protocol server for Mythoria',
};

export function createMcpServer(authContext: McpAuthContext) {
  const server = new McpServer(MCP_SERVER_INFO);

  server.registerTool(
    'health-check',
    {
      description: 'Lightweight readiness probe for the MCP endpoint',
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: 'ok',
        },
      ],
    }),
  );

  registerFaqTools(server, authContext);
  registerStoryTools(server, authContext);
  registerCreditTools(server, authContext);
  registerFulfillmentTools(server, authContext);
  registerTransactionTools(server, authContext);

  return server;
}

function toJsonContent(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function resolveLocale(locale?: string) {
  const fallbackLocale = SUPPORTED_LOCALES[0] ?? 'en-US';
  if (!locale) return fallbackLocale;
  return SUPPORTED_LOCALES.includes(locale) ? locale : fallbackLocale;
}

type FaqSectionWithEntries = Awaited<ReturnType<typeof faqService.getFaqData>>[number];
type FaqEntryWithSection = Awaited<ReturnType<typeof faqService.searchFaqs>>[number];
type FaqEntry = FaqSectionWithEntries['entries'][number];

function registerFaqTools(server: McpServer, _authContext: McpAuthContext) {
  const baseFaqInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired language/locale such as en-US, pt-PT, es-ES. Defaults to en-US.'),
    section: z
      .string()
      .optional()
      .describe('Optional FAQ section key to narrow results (e.g., pricing, onboarding).'),
  });

  const faqListInput = baseFaqInput.extend({
    q: z
      .string()
      .optional()
      .describe('Optional free-text filter to narrow entries using keyword search.'),
  });

  const faqQueryInput = z
    .object({
      question: z
        .string()
        .min(1)
        .describe('The user question or keywords to search within the FAQs.'),
    })
    .merge(baseFaqInput);

  server.registerTool(
    'faq.list',
    {
      description:
        'List FAQ sections and entries in a structured, chatbot-friendly JSON format. Use this to browse available questions before answering user prompts.',
      inputSchema: faqListInput,
    },
    async (input: z.infer<typeof faqListInput>) => {
      const { locale, section, q } = input;
      const resolvedLocale = resolveLocale(locale);
      const faqData = await faqService.getFaqData(resolvedLocale, section, q);

      const payload = {
        locale: resolvedLocale,
        ...(section ? { section } : {}),
        sections: faqData.map((faqSection: FaqSectionWithEntries) => ({
          id: faqSection.id,
          key: faqSection.sectionKey,
          title:
            (faqSection as { title?: string | null; defaultLabel?: string | null }).title ??
            faqSection.defaultLabel ??
            faqSection.sectionKey,
          summary: faqSection.description,
          overview: {
            totalEntries: faqSection.entries.length,
            topQuestions: faqSection.entries.slice(0, 3).map((entry: FaqEntry) => entry.title),
          },
          entries: faqSection.entries.map((entry: FaqEntry) => ({
            id: entry.id,
            question: entry.title,
            answer: entry.contentMdx,
            keywords: entry.keywords ?? [],
            locale: entry.locale,
          })),
        })),
        guidance:
          'Use section.overview.topQuestions to propose quick answers. For ambiguous questions, show section summaries before drilling down.',
      };

      return toJsonContent(payload);
    },
  );

  server.registerTool(
    'faq.query',
    {
      description:
        'Answer a natural-language user question by returning the most relevant FAQ entries with section context.',
      inputSchema: faqQueryInput,
    },
    async (input: z.infer<typeof faqQueryInput>) => {
      const { question, locale } = input;
      const resolvedLocale = resolveLocale(locale);
      const trimmedQuestion = question.trim();
      const results = (await faqService.searchFaqs(
        resolvedLocale,
        trimmedQuestion,
      )) as FaqEntryWithSection[];

      const sectionsForContext = (await faqService.getFaqData(
        resolvedLocale,
      )) as FaqSectionWithEntries[];

      const fallbackSections =
        results.length === 0
          ? ((await faqService.getFaqData(
              resolvedLocale,
              undefined,
              trimmedQuestion,
            )) as FaqSectionWithEntries[])
          : sectionsForContext;

      const fallbackMatches =
        results.length === 0
          ? fallbackSections.flatMap((section: FaqSectionWithEntries) =>
              section.entries.map((entry: FaqEntry) => ({
                ...entry,
                section: {
                  ...section,
                  title:
                    (section as { title?: string | null; defaultLabel?: string | null }).title ??
                    section.defaultLabel ??
                    section.sectionKey,
                },
                relevanceScore: entry.keywords?.some((keyword: string) =>
                  trimmedQuestion.toLowerCase().includes(keyword.toLowerCase()),
                )
                  ? 0.6
                  : 0.4,
              })),
            )
          : [];

      const mergedResults = results.length > 0 ? results : fallbackMatches;
      const topHits = mergedResults.slice(0, 3).map((match) => ({
        id: match.id,
        question: match.title,
        snippet: match.contentMdx.slice(0, 240),
        section: {
          id: match.section.id,
          key: match.section.sectionKey,
          title: match.section.title,
        },
        locale: match.locale,
        relevanceScore: match.relevanceScore ?? null,
      }));

      const sectionOverviews = fallbackSections.map((section: FaqSectionWithEntries) => ({
        id: section.id,
        key: section.sectionKey,
        title:
          (section as { title?: string | null; defaultLabel?: string | null }).title ??
          section.defaultLabel ??
          section.sectionKey,
        summary: section.description,
        totalEntries: section.entries.length,
        topQuestions: section.entries.slice(0, 3).map((entry: FaqEntry) => entry.title),
      }));

      const payload = {
        locale: resolvedLocale,
        question,
        matches: mergedResults.map((result) => ({
          id: result.id,
          question: result.title,
          answer: result.contentMdx,
          relevanceScore: result.relevanceScore,
          section: {
            id: result.section.id,
            key: result.section.sectionKey,
            title: result.section.title,
          },
          locale: result.locale,
        })),
        topHits,
        sectionOverviews,
        guidance:
          'Use the topHits first. If matches look generic, summarize the sectionOverviews and ask a follow-up. Include job/ID links when available.',
        semanticFallbackUsed: results.length === 0,
      };

      return toJsonContent(payload);
    },
  );
}

function registerStoryTools(server: McpServer, authContext: McpAuthContext) {
  const listMineInput = z
    .object({
      includeTemporary: z
        .boolean()
        .optional()
        .describe('Include temporary stories (defaults to false).'),
    })
    .optional();

  server.registerTool(
    'stories.listMine',
    {
      description:
        "List this author's stories with status, language, and metadata. Requires authentication.",
      inputSchema: listMineInput,
    },
    async (input: z.infer<typeof listMineInput>) => {
      const includeTemporary = input?.includeTemporary ?? false;
      const author = requireAuthor(authContext);
      const stories = await storyService.getStoriesByAuthor(author.authorId);
      const filteredStories = stories.filter((story) => includeTemporary || story.status !== 'temporary');

      const payload = {
        authorId: author.authorId,
        total: filteredStories.length,
        stories: filteredStories.map((story) => ({
          id: story.storyId,
          title: story.title,
          status: story.status,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt ?? story.createdAt,
          language: story.storyLanguage,
          audience: story.targetAudience,
          style: story.graphicalStyle,
          isPublic: story.isPublic,
          isFeatured: story.isFeatured,
        })),
        guidance:
          'Use this list to answer questions about the user\'s creations. Filter by status if needed; temporary items are hidden unless explicitly requested.',
      };

      return toJsonContent(payload);
    },
  );
}

function registerCreditTools(server: McpServer, authContext: McpAuthContext) {
  const creditsUsageInput = z
    .object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of recent ledger entries to return (default 50).'),
    })
    .optional();

  server.registerTool(
    'credits.usage',
    {
      description: 'Show the user\'s credit balance and recent transactions. Requires authentication.',
      inputSchema: creditsUsageInput,
    },
    async (input: z.infer<typeof creditsUsageInput>) => {
      const limit = input?.limit ?? 50;
      const author = requireAuthor(authContext);
      const [balance, history] = await Promise.all([
        creditService.getAuthorCreditBalance(author.authorId),
        creditService.getCreditHistory(author.authorId, limit),
      ]);

      const payload = {
        authorId: author.authorId,
        balance,
        entries: history.map((entry) => ({
          id: entry.id,
          amount: entry.amount,
          type: entry.creditEventType,
          storyId: entry.storyId,
          purchaseId: entry.purchaseId,
          occurredAt: entry.createdAt,
        })),
        guidance:
          'Summarize balance and recent changes. Positive amounts add credits; negative amounts consume credits (e.g., generation, printing).',
      };

      return toJsonContent(payload);
    },
  );
}

function createJobPayload(
  type: 'download' | 'print' | 'narrate',
  storyId: string,
  options?: Record<string, unknown>,
) {
  const jobId = crypto.randomUUID();
  const etaSeconds = type === 'print' ? 180 : type === 'narrate' ? 240 : 90;

  return {
    jobId,
    storyId,
    type,
    status: 'queued' as const,
    requestedAt: new Date().toISOString(),
    etaSeconds,
    options,
    guidance:
      'Return the jobId to the user and offer to poll status later. When the track-job tool becomes available, use it with the jobId.',
  };
}

function registerFulfillmentTools(server: McpServer, authContext: McpAuthContext) {
  const storyIdSchema = z
    .string()
    .min(1)
    .describe('The target story ID belonging to the authenticated author.');

  const downloadInputSchema = z.object({
    storyId: storyIdSchema,
    format: z
      .enum(['pdf', 'epub'])
      .default('pdf')
      .describe('Export format to generate (pdf or epub). Defaults to pdf.'),
  });

  const printInputSchema = z.object({
    storyId: storyIdSchema,
    deliveryNotes: z
      .string()
      .optional()
      .describe('Optional notes for printing/shipping preferences.'),
  });

  const narrateInputSchema = z.object({
    storyId: storyIdSchema,
    voiceId: z.string().optional().describe('Voice ID or style to narrate with. Optional.'),
    language: z
      .string()
      .optional()
      .describe('Desired narration language/locale. Defaults to the story language.'),
  });

  server.registerTool(
    'stories.requestDownload',
    {
      description:
        'Queue a downloadable export (PDF/EPUB) for this story. Requires authentication and returns a jobId for polling.',
      inputSchema: downloadInputSchema,
    },
    async (input: z.infer<typeof downloadInputSchema>) => {
      const { storyId, format } = input;
      requireAuthor(authContext);

      const payload = createJobPayload('download', storyId, { format });
      return toJsonContent({
        ...payload,
        guidance:
          'Tell the user the download is queued with the jobId. Offer to notify them when ready or check status later.',
      });
    },
  );

  server.registerTool(
    'stories.requestPrint',
    {
      description:
        'Queue a print-ready PDF generation and send to the print pipeline. Requires authentication.',
      inputSchema: printInputSchema,
    },
    async (input: z.infer<typeof printInputSchema>) => {
      const { storyId, deliveryNotes } = input;
      requireAuthor(authContext);

      const payload = createJobPayload('print', storyId, { deliveryNotes });
      return toJsonContent({
        ...payload,
        guidance:
          'Share the jobId and explain that printing can take several minutes. Offer to follow up when the print PDF is ready.',
      });
    },
  );

  server.registerTool(
    'stories.requestNarrate',
    {
      description:
        'Queue an audio narration job for the story using the selected voice. Requires authentication.',
      inputSchema: narrateInputSchema,
    },
    async (input: z.infer<typeof narrateInputSchema>) => {
      const { storyId, voiceId, language } = input;
      requireAuthor(authContext);

      const payload = createJobPayload('narrate', storyId, { voiceId, language });
      return toJsonContent({
        ...payload,
        guidance:
          'Provide the jobId and expected timing. Offer to share the audio link once narration completes.',
      });
    },
  );
}

function registerTransactionTools(server: McpServer, authContext: McpAuthContext) {
  const transactionListInput = z
    .object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of transactions to return (default 20).'),
    })
    .optional();

  server.registerTool(
    'transactions.list',
    {
      description:
        'List the authenticated user’s payment transactions and credit bundle purchases. Requires authentication.',
      inputSchema: transactionListInput,
    },
    async (input: z.infer<typeof transactionListInput>) => {
      const limit = input?.limit ?? 20;
      const author = requireAuthor(authContext);
      const transactions = await paymentService.getUserPaymentHistory(author.authorId, limit);

      const payload = {
        authorId: author.authorId,
        total: transactions.length,
        transactions: transactions.map((tx) => ({
          id: tx.id,
          providerOrderId: tx.revolutOrderId,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status,
          provider: tx.provider,
          creditBundle: tx.creditBundle,
          createdAt: tx.createdAt,
          updatedAt: tx.updatedAt,
        })),
        guidance:
          'Use this to summarize purchase history and reconcile credits. Mention status (e.g., paid, pending, failed).',
      };

      return toJsonContent(payload);
    },
  );

  server.registerTool(
    'credits.purchaseOptions',
    {
      description:
        'List available credit bundles that users can purchase. Does not require authentication.',
    },
    async () => {
      const packages = await creditPackagesService.getActiveCreditPackages();

      const payload = {
        total: packages.length,
        options: packages.map((pkg) => ({
          id: pkg.id,
          key: pkg.key,
          credits: pkg.credits,
          price: pkg.price,
          currency: DEFAULT_CURRENCY,
          bestValue: pkg.bestValue,
          popular: pkg.popular,
          icon: pkg.icon,
        })),
        guidance:
          'Recommend a package by credits/price. If the user is logged in, combine with transactions.list or credits.usage to tailor suggestions.',
      };

      return toJsonContent(payload);
    },
  );
}

export async function handleMcpHttpRequest(request: Request) {
  let authContext: McpAuthContext = { author: null, userId: null };

  try {
    authContext = await resolveMcpAuthContext(request);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    throw error;
  }

  const server = createMcpServer(authContext);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();

  return response;
}

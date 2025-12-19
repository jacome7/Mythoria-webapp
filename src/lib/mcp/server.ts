import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp';
import { z } from 'zod';

import { SUPPORTED_LOCALES } from '@/config/locales';
import { faqService } from '@/db/services';

const MCP_SERVER_INFO = {
  name: 'mythoria-mcp',
  version: '0.1.0',
  description: 'Model Context Protocol server for Mythoria',
};

export function createMcpServer() {
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

  registerFaqTools(server);

  return server;
}

function toJsonContent(payload: unknown) {
  return {
    content: [
      {
        type: 'text',
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

function registerFaqTools(server: McpServer) {
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

  server.registerTool(
    'faq.list',
    {
      description:
        'List FAQ sections and entries in a structured, chatbot-friendly JSON format. Use this to browse available questions before answering user prompts.',
      inputSchema: baseFaqInput.extend({
        q: z
          .string()
          .optional()
          .describe('Optional free-text filter to narrow entries using keyword search.'),
      }),
    },
    async ({ locale, section, q }) => {
      const resolvedLocale = resolveLocale(locale);
      const faqData = await faqService.getFaqData(resolvedLocale, section, q);

      const payload = {
        locale: resolvedLocale,
        ...(section ? { section } : {}),
        sections: faqData.map((faqSection) => ({
          id: faqSection.id,
          key: faqSection.sectionKey,
          title: faqSection.title,
          summary: faqSection.description,
          entries: faqSection.entries.map((entry) => ({
            id: entry.id,
            question: entry.title,
            answer: entry.contentMdx,
            keywords: entry.keywords,
            locale: entry.locale,
          })),
        })),
      };

      return toJsonContent(payload);
    },
  );

  server.registerTool(
    'faq.query',
    {
      description:
        'Answer a natural-language user question by returning the most relevant FAQ entries with section context.',
      inputSchema: z
        .object({
          question: z
            .string()
            .min(1)
            .describe('The user question or keywords to search within the FAQs.'),
        })
        .merge(baseFaqInput),
    },
    async ({ question, locale }) => {
      const resolvedLocale = resolveLocale(locale);
      const results = await faqService.searchFaqs(resolvedLocale, question);

      const payload = {
        locale: resolvedLocale,
        question,
        matches: results.map((result) => ({
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
        guidance:
          'Use the answer text directly in chatbot replies. If matches are empty, fall back to faq.list to browse sections.',
      };

      return toJsonContent(payload);
    },
  );
}

export async function handleMcpHttpRequest(request: Request) {
  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  await server.close();

  return response;
}

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { DEFAULT_CURRENCY } from '@/config/currency';
import { SUPPORTED_LOCALES } from '@/config/locales';
import {
  chapterService,
  characterService,
  creditPackagesService,
  creditService,
  faqService,
  paymentService,
  printRequestService,
  pricingService,
  storyCharacterService,
  storyService,
} from '@/db/services';
import { publishAudiobookRequest, publishStoryRequest } from '@/lib/pubsub';
import {
  getAvailableVoices,
  getDefaultVoice,
  getTTSProvider,
  isValidVoice,
} from '@/lib/voice-options';
import { CHARACTER_AGES, CHARACTER_ROLES } from '@/types/character-enums';
import { GraphicalStyle, LiteraryPersona, NovelStyle, TargetAudience } from '@/types/story-enums';
import crypto from 'crypto';

import {
  McpAuthError,
  MCP_PROTECTED_TOOL_SCOPE,
  MCP_PROTECTED_TOOL_SCOPES,
  type McpAuthContext,
  requireAuthor,
  resolveMcpAuthContext,
  toMcpAuthErrorResult,
} from './auth';
import {
  MCP_APP_RESOURCE_MIME_TYPE,
  WIDGET_SURFACE_RESOURCE_URIS,
  WIDGET_TEMPLATES,
  type WidgetSurface,
} from './ui-widgets';

const MCP_SERVER_INFO = {
  name: 'mythoria-mcp',
  version: '0.9.0',
  description: 'Model Context Protocol server for Mythoria',
};

const TOOL_NAMES = {
  discoveryPing: 'mythoria.discovery.ping',
  discoveryCapabilities: 'mythoria.discovery.capabilities',
  discoverySampleStoryPreview: 'mythoria.discovery.sample_story_preview',
  discoveryFeaturedStories: 'mythoria.discovery.featured_stories',
  helpBrowse: 'mythoria.help.browse',
  helpSearch: 'mythoria.help.search',
  coachStoryGuidance: 'mythoria.coach.story_guidance',
  accountStoryList: 'mythoria.account.story_list',
  accountStorySelect: 'mythoria.account.story_select',
  storyReadOverview: 'mythoria.story.read_overview',
  storyReadChapter: 'mythoria.story.read_chapter',
  storyReadNextChapter: 'mythoria.story.read_next_chapter',
  storyAudioStatus: 'mythoria.story.audio_status',
  storyAudioChapter: 'mythoria.story.audio_chapter',
  storyVoiceCatalog: 'mythoria.story.voice_catalog',
  storyShareState: 'mythoria.story.share_state',
  storyShareCreateLink: 'mythoria.story.share_create_link',
  storyShareRevokeLink: 'mythoria.story.share_revoke_link',
  accountCreditUsage: 'mythoria.account.credit_usage',
  creditsCheckEligibility: 'mythoria.credits.check_eligibility',
  accountPaymentHistory: 'mythoria.account.payment_history',
  catalogCreditPackages: 'mythoria.catalog.credit_packages',
  storyCreateDraft: 'mythoria.story.create_draft',
  storyUpdateDraft: 'mythoria.story.update_draft',
  storyAddCharacters: 'mythoria.story.add_characters',
  storyStartGeneration: 'mythoria.story.start_generation',
  storyExportRequest: 'mythoria.story.export_request',
  storyPrintRequest: 'mythoria.story.print_request',
  storyNarrationRequest: 'mythoria.story.narration_request',
  jobsStatus: 'mythoria.jobs.status',
} as const;

const APP_BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'https://mythoria.pt').replace(
  /\/+$/,
  '',
);
const APP_BASE_ORIGIN = resolveUrlOrigin(APP_BASE_URL, 'https://mythoria.pt');
const APP_WIDGET_DOMAIN = resolveUrlOrigin(
  process.env.MCP_WIDGET_DOMAIN || APP_BASE_URL,
  APP_BASE_ORIGIN,
);

type ToolUiBinding = {
  surface: WidgetSurface;
  resourceUri: string;
  invokingText: string;
  invokedText: string;
};

type ToolSecurityScheme = { type: 'noauth' } | { type: 'oauth2'; scopes: string[] };
type ToolAuthPolicy = {
  securitySchemes: ToolSecurityScheme[];
  requiredScopes: string[];
};

const PROTECTED_TOOL_SCOPE = MCP_PROTECTED_TOOL_SCOPE;

function buildProtectedToolPolicy(): ToolAuthPolicy {
  return {
    securitySchemes: [{ type: 'oauth2', scopes: [...MCP_PROTECTED_TOOL_SCOPES] }],
    requiredScopes: [...MCP_PROTECTED_TOOL_SCOPES],
  };
}

function buildMixedAccessToolPolicy(): ToolAuthPolicy {
  return {
    securitySchemes: [
      { type: 'noauth' },
      { type: 'oauth2', scopes: [...MCP_PROTECTED_TOOL_SCOPES] },
    ],
    requiredScopes: [],
  };
}

const TOOL_AUTH_POLICIES: Record<(typeof TOOL_NAMES)[keyof typeof TOOL_NAMES], ToolAuthPolicy> = {
  [TOOL_NAMES.discoveryPing]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.discoveryCapabilities]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.discoverySampleStoryPreview]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.discoveryFeaturedStories]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.helpBrowse]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.helpSearch]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.coachStoryGuidance]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.catalogCreditPackages]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.accountStoryList]: buildProtectedToolPolicy(),
  [TOOL_NAMES.accountStorySelect]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyReadOverview]: buildMixedAccessToolPolicy(),
  [TOOL_NAMES.storyReadChapter]: buildMixedAccessToolPolicy(),
  [TOOL_NAMES.storyReadNextChapter]: buildMixedAccessToolPolicy(),
  [TOOL_NAMES.storyAudioStatus]: buildMixedAccessToolPolicy(),
  [TOOL_NAMES.storyAudioChapter]: buildMixedAccessToolPolicy(),
  [TOOL_NAMES.storyVoiceCatalog]: {
    securitySchemes: [{ type: 'noauth' }],
    requiredScopes: [],
  },
  [TOOL_NAMES.storyShareState]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyShareCreateLink]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyShareRevokeLink]: buildProtectedToolPolicy(),
  [TOOL_NAMES.accountCreditUsage]: buildProtectedToolPolicy(),
  [TOOL_NAMES.creditsCheckEligibility]: buildProtectedToolPolicy(),
  [TOOL_NAMES.accountPaymentHistory]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyCreateDraft]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyUpdateDraft]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyAddCharacters]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyStartGeneration]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyExportRequest]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyPrintRequest]: buildProtectedToolPolicy(),
  [TOOL_NAMES.storyNarrationRequest]: buildProtectedToolPolicy(),
  [TOOL_NAMES.jobsStatus]: buildProtectedToolPolicy(),
};

const TOOL_UI_BINDINGS: Partial<
  Record<(typeof TOOL_NAMES)[keyof typeof TOOL_NAMES], ToolUiBinding>
> = {
  [TOOL_NAMES.coachStoryGuidance]: {
    surface: 'storyCreation',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    invokingText: 'Preparing story guidance...',
    invokedText: 'Story guidance ready.',
  },
  [TOOL_NAMES.storyCreateDraft]: {
    surface: 'storyCreation',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    invokingText: 'Creating draft...',
    invokedText: 'Draft updated.',
  },
  [TOOL_NAMES.storyUpdateDraft]: {
    surface: 'storyCreation',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    invokingText: 'Updating draft...',
    invokedText: 'Draft updated.',
  },
  [TOOL_NAMES.storyAddCharacters]: {
    surface: 'storyCreation',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    invokingText: 'Updating characters...',
    invokedText: 'Characters updated.',
  },
  [TOOL_NAMES.storyStartGeneration]: {
    surface: 'storyCreation',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyCreation,
    invokingText: 'Checking generation readiness...',
    invokedText: 'Generation response ready.',
  },
  [TOOL_NAMES.accountStoryList]: {
    surface: 'storyLibrary',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    invokingText: 'Loading story library...',
    invokedText: 'Story library ready.',
  },
  [TOOL_NAMES.accountStorySelect]: {
    surface: 'storyLibrary',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    invokingText: 'Resolving story...',
    invokedText: 'Story selection ready.',
  },
  [TOOL_NAMES.storyShareState]: {
    surface: 'storyLibrary',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    invokingText: 'Loading sharing state...',
    invokedText: 'Sharing state ready.',
  },
  [TOOL_NAMES.storyShareCreateLink]: {
    surface: 'storyLibrary',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    invokingText: 'Preparing share link...',
    invokedText: 'Share link ready.',
  },
  [TOOL_NAMES.storyShareRevokeLink]: {
    surface: 'storyLibrary',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyLibrary,
    invokingText: 'Revoking share access...',
    invokedText: 'Share access updated.',
  },
  [TOOL_NAMES.storyReadOverview]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Loading reading overview...',
    invokedText: 'Reading overview ready.',
  },
  [TOOL_NAMES.storyReadChapter]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Loading chapter...',
    invokedText: 'Chapter ready.',
  },
  [TOOL_NAMES.storyReadNextChapter]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Loading chapter...',
    invokedText: 'Chapter ready.',
  },
  [TOOL_NAMES.storyAudioStatus]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Loading audiobook status...',
    invokedText: 'Audiobook status ready.',
  },
  [TOOL_NAMES.storyAudioChapter]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Loading chapter audio...',
    invokedText: 'Chapter audio ready.',
  },
  [TOOL_NAMES.storyNarrationRequest]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Preparing narration request...',
    invokedText: 'Narration response ready.',
  },
  [TOOL_NAMES.jobsStatus]: {
    surface: 'storyReader',
    resourceUri: WIDGET_SURFACE_RESOURCE_URIS.storyReader,
    invokingText: 'Checking job status...',
    invokedText: 'Job status ready.',
  },
};

function resolveToolAuthPolicy(toolName: string): ToolAuthPolicy | null {
  return (TOOL_AUTH_POLICIES as Record<string, ToolAuthPolicy | undefined>)[toolName] ?? null;
}

function resolveToolRequiredScopes(toolName: string): string[] {
  return resolveToolAuthPolicy(toolName)?.requiredScopes ?? [];
}

function resolveToolUiBinding(toolName: string): ToolUiBinding | null {
  return (TOOL_UI_BINDINGS as Record<string, ToolUiBinding | undefined>)[toolName] ?? null;
}

type DiscoveryCopy = {
  tagline: string;
  discoveryGuidance: string;
  helpGuidance: string;
  sampleHint: string;
  sampleUnavailable: string;
};

const DISCOVERY_COPY: Record<string, DiscoveryCopy> = {
  'en-US': {
    tagline: 'Create personalized stories with images and audio in minutes.',
    discoveryGuidance: 'Use Mythoria for creating, improving, reading, and listening to stories.',
    helpGuidance: 'Use top hits first and ask follow-up questions when results are broad.',
    sampleHint: 'This preview is pre-generated to keep latency and cost low.',
    sampleUnavailable: 'No sample preview is available right now.',
  },
  'pt-PT': {
    tagline: 'Crie historias personalizadas com imagens e audio em minutos.',
    discoveryGuidance: 'Use Mythoria para criar, melhorar, ler e ouvir historias personalizadas.',
    helpGuidance:
      'Use primeiro os melhores resultados e faca perguntas de clarificacao quando necessario.',
    sampleHint: 'Esta amostra e pre-gerada para manter latencia e custo baixos.',
    sampleUnavailable: 'Nenhuma amostra esta disponivel neste momento.',
  },
  'es-ES': {
    tagline: 'Crea historias personalizadas con imagenes y audio en minutos.',
    discoveryGuidance:
      'Usa Mythoria para crear, mejorar, leer y escuchar historias personalizadas.',
    helpGuidance:
      'Usa primero los mejores resultados y haz preguntas de aclaracion cuando haga falta.',
    sampleHint: 'Esta muestra es pre-generada para reducir latencia y coste.',
    sampleUnavailable: 'No hay muestra disponible en este momento.',
  },
  'fr-FR': {
    tagline: 'Creez des histoires personnalisees avec images et audio en quelques minutes.',
    discoveryGuidance:
      'Utilisez Mythoria pour creer, ameliorer, lire et ecouter des histoires personnalisees.',
    helpGuidance:
      'Commencez par les meilleurs resultats et posez des questions de clarification si besoin.',
    sampleHint: 'Cet exemple est pre-genere pour reduire latence et cout.',
    sampleUnavailable: "Aucun exemple n'est disponible pour le moment.",
  },
  'de-DE': {
    tagline: 'Erstelle personalisierte Geschichten mit Bildern und Audio in wenigen Minuten.',
    discoveryGuidance:
      'Nutze Mythoria zum Erstellen, Verbessern, Lesen und Horen personalisierter Geschichten.',
    helpGuidance:
      'Nutze zuerst die besten Treffer und stelle Klarungsfragen, wenn die Antwort zu breit ist.',
    sampleHint: 'Diese Vorschau ist vorab erzeugt, um Latenz und Kosten niedrig zu halten.',
    sampleUnavailable: 'Aktuell ist keine Beispielvorschau verfugbar.',
  },
};

type ToolInput = Record<string, unknown> | undefined;
type McpToolResult = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
};

class McpToolUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpToolUserError';
  }
}

export function createMcpServer(authContext: McpAuthContext) {
  const server = new McpServer(MCP_SERVER_INFO);
  registerUiResources(server);

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

  registerDiscoveryTools(server, authContext);
  registerHelpTools(server, authContext);
  registerStoryTools(server, authContext);
  registerSharingTools(server, authContext);
  registerCreditTools(server, authContext);
  registerFulfillmentTools(server, authContext);
  registerTransactionTools(server, authContext);
  installToolListMetadataHandler(server);

  return server;
}

type RawRequestHandler = (request: unknown, extra: unknown) => Promise<unknown> | unknown;

function registerUiResources(server: McpServer) {
  const connectDomains = [APP_BASE_ORIGIN];
  const resourceDomains = [
    APP_BASE_ORIGIN,
    'https://storage.googleapis.com',
    'https://*.oaistatic.com',
  ];
  const resourceServer = server as unknown as {
    registerResource?: (
      name: string,
      uri: string,
      config: Record<string, unknown>,
      readCallback: (uri: URL, extra: unknown) => Promise<Record<string, unknown>>,
    ) => void;
    resource?: (
      name: string,
      uri: string,
      config: Record<string, unknown>,
      readCallback: (uri: URL, extra: unknown) => Promise<Record<string, unknown>>,
    ) => void;
  };
  const registerResource = resourceServer.registerResource ?? resourceServer.resource;
  if (!registerResource) return;

  for (const template of WIDGET_TEMPLATES) {
    registerResource.call(
      server,
      template.name,
      template.resourceUri,
      {
        title: template.title,
        description: template.description,
        mimeType: MCP_APP_RESOURCE_MIME_TYPE,
      },
      async () => ({
        contents: [
          {
            uri: template.resourceUri,
            mimeType: MCP_APP_RESOURCE_MIME_TYPE,
            text: template.html,
            _meta: {
              ui: {
                prefersBorder: template.prefersBorder,
                csp: {
                  connectDomains,
                  resourceDomains,
                },
                domain: APP_WIDGET_DOMAIN,
              },
              'openai/widgetDescription': template.widgetDescription,
              'openai/widgetPrefersBorder': template.prefersBorder,
              'openai/widgetDomain': APP_WIDGET_DOMAIN,
              'openai/widgetCSP': {
                connect_domains: connectDomains,
                resource_domains: resourceDomains,
              },
            },
          },
        ],
      }),
    );
  }
}

function installToolListMetadataHandler(server: McpServer) {
  const protocolServer = (
    server as unknown as {
      server: {
        _requestHandlers?: Map<string, RawRequestHandler>;
        setRequestHandler: (
          schema: typeof ListToolsRequestSchema,
          handler: (request: unknown, extra: unknown) => Promise<unknown>,
        ) => void;
      };
    }
  ).server;

  const baseListHandler = protocolServer._requestHandlers?.get('tools/list');
  if (!baseListHandler) return;

  protocolServer.setRequestHandler(ListToolsRequestSchema, async (request, extra) => {
    const baseResult = (await baseListHandler(request, extra)) as { tools?: unknown[] };
    if (!Array.isArray(baseResult?.tools)) return baseResult;

    return {
      ...baseResult,
      tools: baseResult.tools.map((rawTool) => {
        const tool = rawTool as {
          name?: string;
          _meta?: Record<string, unknown>;
        } & Record<string, unknown>;
        const toolName = typeof tool.name === 'string' ? tool.name : '';
        const policy = resolveToolAuthPolicy(toolName);
        if (!policy) return tool;

        const uiBinding = resolveToolUiBinding(toolName);
        const existingMeta = isObjectRecord(tool._meta) ? { ...tool._meta } : {};
        const nextMeta: Record<string, unknown> = {
          ...existingMeta,
          securitySchemes: policy.securitySchemes,
        };

        if (uiBinding) {
          const existingUi = isObjectRecord(nextMeta.ui) ? { ...nextMeta.ui } : {};
          nextMeta.ui = {
            ...existingUi,
            resourceUri: uiBinding.resourceUri,
          };
          nextMeta['openai/outputTemplate'] = uiBinding.resourceUri;
          nextMeta['openai/toolInvocation/invoking'] = uiBinding.invokingText;
          nextMeta['openai/toolInvocation/invoked'] = uiBinding.invokedText;
        }

        return {
          ...tool,
          securitySchemes: policy.securitySchemes,
          _meta: nextMeta,
        };
      }),
    };
  });
}

function toJsonContent(payload: unknown): McpToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toStructuredToolResult(
  summary: string,
  structuredContent: Record<string, unknown>,
  meta?: Record<string, unknown>,
): McpToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent,
    ...(meta ? { _meta: meta } : {}),
  };
}

function toUserErrorResult(error: McpToolUserError): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: error.message,
      },
    ],
    structuredContent: {
      error: {
        message: error.message,
      },
    },
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveUrlOrigin(rawUrl: string, fallbackOrigin: string): string {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return fallbackOrigin;
  }
}

function attachToolUiMetadata(toolName: string, result: McpToolResult): McpToolResult {
  if (result.isError || !result.structuredContent) {
    return result;
  }

  const binding = resolveToolUiBinding(toolName);
  if (!binding) {
    return result;
  }

  const meta = isObjectRecord(result._meta) ? { ...result._meta } : {};
  const uiMeta = isObjectRecord(meta.ui) ? { ...meta.ui } : {};

  meta.ui = {
    ...uiMeta,
    resourceUri: binding.resourceUri,
  };
  meta['openai/outputTemplate'] = binding.resourceUri;

  return {
    ...result,
    _meta: meta,
  };
}

function resolveLocale(locale?: string) {
  const fallbackLocale = SUPPORTED_LOCALES[0] ?? 'en-US';
  if (!locale) return fallbackLocale;
  return SUPPORTED_LOCALES.includes(locale) ? locale : fallbackLocale;
}

function getDiscoveryCopy(locale: string): DiscoveryCopy {
  return DISCOVERY_COPY[locale] ?? DISCOVERY_COPY['en-US'];
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars).trim()}...`;
}

function resolveStoryWebUrl(locale: string, slug: string): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}`;
}

function resolveStoryApiUrl(slug: string): string {
  return `${APP_BASE_URL}/api/p/${slug}`;
}

function resolveStoryAudioPreviewUrl(slug: string, chapterIndex = 0): string {
  return `${APP_BASE_URL}/api/p/${slug}/audio/${chapterIndex}`;
}

function resolveAuthorStoryAudioApiUrl(storyId: string, chapterIndex: number): string {
  return `${APP_BASE_URL}/api/stories/${storyId}/audio/${chapterIndex}`;
}

function resolveAuthorStoryReadUrl(locale: string, storyId: string): string {
  return `${APP_BASE_URL}/${locale}/stories/read/${storyId}`;
}

function resolveAuthorStoryReadChapterUrl(
  locale: string,
  storyId: string,
  chapterNumber: number,
): string {
  return `${APP_BASE_URL}/${locale}/stories/read/${storyId}/chapter/${chapterNumber}`;
}

function resolveAuthorStoryListenUrl(locale: string, storyId: string): string {
  return `${APP_BASE_URL}/${locale}/stories/listen/${storyId}`;
}

function resolvePublicStoryChapterUrl(locale: string, slug: string, chapterNumber: number): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}/chapter/${chapterNumber}`;
}

function resolvePublicStoryListenUrl(locale: string, slug: string): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}/listen`;
}

function resolvePrivateShareUrl(token: string, accessLevel: 'view' | 'edit'): string {
  return accessLevel === 'edit' ? `${APP_BASE_URL}/s/${token}/edit` : `${APP_BASE_URL}/s/${token}`;
}

function resolveAuthorStoryEditUrl(
  locale: string,
  storyId: string,
  status: StoryStatusValue,
): string | null {
  if (status === 'writing') return null;
  if (status === 'draft' || status === 'temporary') {
    return `${APP_BASE_URL}/${locale}/tell-your-story/step-3?edit=${storyId}`;
  }
  return `${APP_BASE_URL}/${locale}/stories/edit/${storyId}`;
}

function extractLocaleFromInput(input?: ToolInput): string | null {
  const localeValue = input?.locale;
  return typeof localeValue === 'string' ? resolveLocale(localeValue) : null;
}

function toSerializableError(error: unknown): {
  message: string;
  code?: string | number;
  oauthError?: string;
  requiredScopes?: string[];
} {
  if (error instanceof McpAuthError) {
    return {
      message: error.message,
      code: error.status,
      oauthError: error.oauthError,
      requiredScopes: error.requiredScopes,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unknown error' };
}

async function executeTool(
  toolName: string,
  authContext: McpAuthContext,
  input: ToolInput,
  run: () => Promise<McpToolResult>,
): Promise<McpToolResult> {
  const startedAt = Date.now();
  const locale = extractLocaleFromInput(input);
  const authState = authContext.author ? 'authenticated' : 'anonymous';

  console.info(
    '[mcp-tool]',
    JSON.stringify({
      event: 'start',
      toolName,
      authState,
      locale,
      startedAt: new Date(startedAt).toISOString(),
    }),
  );

  try {
    const rawResult = await run();
    const result = attachToolUiMetadata(toolName, rawResult);
    console.info(
      '[mcp-tool]',
      JSON.stringify({
        event: 'success',
        toolName,
        authState,
        locale,
        latencyMs: Date.now() - startedAt,
      }),
    );
    return result;
  } catch (error) {
    const serialized = toSerializableError(error);
    console.info(
      '[mcp-tool]',
      JSON.stringify({
        event: 'error',
        toolName,
        authState,
        locale,
        latencyMs: Date.now() - startedAt,
        error: serialized,
      }),
    );
    if (error instanceof McpAuthError) {
      return toMcpAuthErrorResult(error);
    }
    if (error instanceof McpToolUserError) {
      return toUserErrorResult(error);
    }
    throw error;
  }
}

type FaqSectionWithEntries = Awaited<ReturnType<typeof faqService.getFaqData>>[number];
type FaqEntryWithSection = Awaited<ReturnType<typeof faqService.searchFaqs>>[number];
type FaqEntry = FaqSectionWithEntries['entries'][number];
type FeaturedStory = Awaited<ReturnType<typeof storyService.getFeaturedPublicStories>>[number];
type StoryRecord = NonNullable<Awaited<ReturnType<typeof storyService.getStoryById>>>;
type AuthorStoryRecord = Awaited<ReturnType<typeof storyService.getStoriesByAuthor>>[number];
type StoryChapterRecord = Awaited<ReturnType<typeof chapterService.getStoryChapters>>[number];
type RequiredStoryField = 'title' | 'targetAudience' | 'novelStyle' | 'graphicalStyle';
type StoryGenerationFeatures = {
  ebook: boolean;
  printed: boolean;
  audiobook: boolean;
};
type StoryStatusValue = 'temporary' | 'draft' | 'writing' | 'published';
type StoryLibrarySortBy = 'updatedAt' | 'createdAt' | 'title';
type StoryLibrarySortDirection = 'asc' | 'desc';
type StoryLibraryActionKey =
  | 'read'
  | 'listen'
  | 'generateAudiobook'
  | 'edit'
  | 'share'
  | 'export'
  | 'print'
  | 'resumeDraft'
  | 'waitForCompletion';
type StoryLibraryAction = {
  id: StoryLibraryActionKey;
  label: string;
  available: boolean;
  reason: string;
  reasonCode: string;
  targetTool?: string;
  url?: string;
};
type StoryListCursorPayload = {
  offset: number;
  sortBy: StoryLibrarySortBy;
  sortDirection: StoryLibrarySortDirection;
};
type StoryAudioGenerationStatus = 'not_started' | 'generating' | 'completed' | 'failed';
type StoryAudioAccessLevel = 'owner' | 'public';
type StoryReadMode = 'full' | 'summary' | 'excerpt';
type StoryReadNavigationDirection = 'next' | 'previous';
type AudiobookChapterEntry = {
  chapterNumber: number;
  title: string;
  audioUri: string;
  duration: number | null;
  imageUri: string | null;
};
type StoryLibraryCopy = {
  listSummary: string;
  listGuidance: string;
  selectionResolved: string;
  selectionAmbiguous: string;
  selectionNotFound: string;
  disambiguationPrompt: string;
  actionLabels: Record<StoryLibraryActionKey, string>;
};
type StoryReadingCopy = {
  overviewReady: string;
  chapterReady: string;
  chapterNotFound: string;
  noChaptersAvailable: string;
  privateAuthRequired: string;
  guidance: string;
};
type StoryListeningCopy = {
  statusReady: string;
  chapterReady: string;
  chapterNotFound: string;
  audioUnavailable: string;
  generationPreview: string;
  generationQueued: string;
  generationInProgress: string;
  insufficientCredits: string;
  privateAuthRequired: string;
  guidance: string;
};
type StoryCoachIntent = 'creative_coaching' | 'product_info' | 'story_creation_request';
type StoryCoachCopy = {
  ready: string;
  faqRouting: string;
  creationRouting: string;
  coachingGuidance: string;
};
type StorySharingCopy = {
  stateReady: string;
  linkCreated: string;
  linkRevoked: string;
  publicConfirmationRequired: string;
  revokeConfirmationRequired: string;
};
type CreditEligibilityAction = 'ebook' | 'audiobook' | 'print' | 'story_generation';
type CreditEligibilityCopy = {
  eligibilityReady: string;
  insufficientCredits: string;
  eligible: string;
  policyGuidance: string;
};
type JobStatusCopy = {
  statusReady: string;
  invalidJobId: string;
  guidance: string;
};
type TrackedJobType = 'story_generation' | 'audiobook_generation' | 'export' | 'print';
type TrackedJobState = 'queued' | 'running' | 'completed' | 'failed';
type TrackedJobToken = {
  type: TrackedJobType;
  storyId: string;
  runId: string | null;
  requestedAt: string;
};
type TrackedJobDescriptor = TrackedJobToken & {
  jobId: string;
  etaSeconds: number;
};

const STORY_STATUS_VALUES = ['temporary', 'draft', 'writing', 'published'] as const;
const STORY_LIBRARY_SORT_FIELDS = ['updatedAt', 'createdAt', 'title'] as const;
const STORY_LIBRARY_SORT_DIRECTIONS = ['asc', 'desc'] as const;
const STORY_READ_MODES = ['full', 'summary', 'excerpt'] as const;
const STORY_READ_NAVIGATION_DIRECTIONS = ['next', 'previous'] as const;
const STORY_AUDIO_GENERATION_STATUS_VALUES = [
  'not_started',
  'generating',
  'completed',
  'failed',
] as const;
const TRACKED_JOB_TYPES = ['story_generation', 'audiobook_generation', 'export', 'print'] as const;
const TRACKED_JOB_ID_PREFIX = 'mythoria-job:';

const STORY_LIBRARY_COPY: Record<string, StoryLibraryCopy> = {
  'en-US': {
    listSummary: 'Story library retrieved.',
    listGuidance:
      'Use these stories to help the user choose what to read, listen to, edit, or share next.',
    selectionResolved: 'Story selected.',
    selectionAmbiguous: 'Multiple stories match this request.',
    selectionNotFound: 'No story matched this request.',
    disambiguationPrompt: 'Ask the user to choose one story by storyId or exact title.',
    actionLabels: {
      read: 'Read now',
      listen: 'Listen now',
      generateAudiobook: 'Generate audiobook',
      edit: 'Edit story',
      share: 'Share story',
      export: 'Export ebook',
      print: 'Request print output',
      resumeDraft: 'Continue draft',
      waitForCompletion: 'Wait for generation',
    },
  },
  'pt-PT': {
    listSummary: 'Biblioteca de historias obtida.',
    listGuidance:
      'Use estas historias para ajudar o utilizador a escolher o que ler, ouvir, editar ou partilhar.',
    selectionResolved: 'Historia selecionada.',
    selectionAmbiguous: 'Varias historias correspondem ao pedido.',
    selectionNotFound: 'Nenhuma historia correspondeu ao pedido.',
    disambiguationPrompt: 'Peca ao utilizador para escolher uma historia por storyId ou titulo.',
    actionLabels: {
      read: 'Ler agora',
      listen: 'Ouvir agora',
      generateAudiobook: 'Gerar audiobook',
      edit: 'Editar historia',
      share: 'Partilhar historia',
      export: 'Exportar ebook',
      print: 'Pedir impressao',
      resumeDraft: 'Continuar rascunho',
      waitForCompletion: 'Aguardar geracao',
    },
  },
  'es-ES': {
    listSummary: 'Biblioteca de historias obtenida.',
    listGuidance:
      'Usa estas historias para ayudar al usuario a elegir que leer, escuchar, editar o compartir.',
    selectionResolved: 'Historia seleccionada.',
    selectionAmbiguous: 'Varias historias coinciden con la solicitud.',
    selectionNotFound: 'Ninguna historia coincide con la solicitud.',
    disambiguationPrompt: 'Pide al usuario que elija una historia por storyId o por titulo exacto.',
    actionLabels: {
      read: 'Leer ahora',
      listen: 'Escuchar ahora',
      generateAudiobook: 'Generar audiobook',
      edit: 'Editar historia',
      share: 'Compartir historia',
      export: 'Exportar ebook',
      print: 'Solicitar impresion',
      resumeDraft: 'Continuar borrador',
      waitForCompletion: 'Esperar generacion',
    },
  },
  'fr-FR': {
    listSummary: "Bibliotheque d'histoires recuperee.",
    listGuidance:
      "Utilisez ces histoires pour aider l'utilisateur a choisir quoi lire, ecouter, modifier ou partager.",
    selectionResolved: 'Histoire selectionnee.',
    selectionAmbiguous: 'Plusieurs histoires correspondent a cette demande.',
    selectionNotFound: 'Aucune histoire ne correspond a cette demande.',
    disambiguationPrompt:
      "Demandez a l'utilisateur de choisir une histoire par storyId ou titre exact.",
    actionLabels: {
      read: 'Lire maintenant',
      listen: 'Ecouter maintenant',
      generateAudiobook: 'Generer audiobook',
      edit: "Modifier l'histoire",
      share: "Partager l'histoire",
      export: 'Exporter ebook',
      print: "Demander l'impression",
      resumeDraft: 'Continuer le brouillon',
      waitForCompletion: 'Attendre la generation',
    },
  },
  'de-DE': {
    listSummary: 'Story-Bibliothek geladen.',
    listGuidance:
      'Nutze diese Stories, um dem Nutzer beim Auswahlen fur Lesen, Horen, Bearbeiten oder Teilen zu helfen.',
    selectionResolved: 'Story ausgewahlt.',
    selectionAmbiguous: 'Mehrere Stories passen zu dieser Anfrage.',
    selectionNotFound: 'Keine Story passt zu dieser Anfrage.',
    disambiguationPrompt:
      'Bitte den Nutzer, eine Story per storyId oder exaktem Titel auszuwahlen.',
    actionLabels: {
      read: 'Jetzt lesen',
      listen: 'Jetzt horen',
      generateAudiobook: 'Audiobook erstellen',
      edit: 'Story bearbeiten',
      share: 'Story teilen',
      export: 'Ebook exportieren',
      print: 'Druck anfragen',
      resumeDraft: 'Entwurf fortsetzen',
      waitForCompletion: 'Auf Generierung warten',
    },
  },
};

const DEFAULT_STORY_TITLE = 'Untitled Story Draft';
const REQUIRED_STORY_FIELDS: RequiredStoryField[] = [
  'title',
  'targetAudience',
  'novelStyle',
  'graphicalStyle',
];
const TARGET_AUDIENCE_CHAPTER_COUNT: Record<TargetAudience, number> = {
  [TargetAudience.CHILDREN_0_2]: 2,
  [TargetAudience.CHILDREN_3_6]: 4,
  [TargetAudience.CHILDREN_7_10]: 6,
  [TargetAudience.CHILDREN_11_14]: 6,
  [TargetAudience.YOUNG_ADULT_15_17]: 8,
  [TargetAudience.ADULT_18_PLUS]: 10,
  [TargetAudience.ALL_AGES]: 6,
};
const DEFAULT_CHAPTER_COUNT = 6;

const REQUIRED_STORY_FIELD_LABELS: Record<string, Record<RequiredStoryField, string>> = {
  'en-US': {
    title: 'title',
    targetAudience: 'target audience',
    novelStyle: 'novel style',
    graphicalStyle: 'graphical style',
  },
  'pt-PT': {
    title: 'titulo',
    targetAudience: 'publico-alvo',
    novelStyle: 'estilo narrativo',
    graphicalStyle: 'estilo grafico',
  },
  'es-ES': {
    title: 'titulo',
    targetAudience: 'publico objetivo',
    novelStyle: 'estilo narrativo',
    graphicalStyle: 'estilo grafico',
  },
  'fr-FR': {
    title: 'titre',
    targetAudience: 'public cible',
    novelStyle: 'style narratif',
    graphicalStyle: 'style graphique',
  },
  'de-DE': {
    title: 'titel',
    targetAudience: 'zielgruppe',
    novelStyle: 'erzahlstil',
    graphicalStyle: 'grafikstil',
  },
};

type StoryCreationCopy = {
  draftCreated: string;
  draftUpdated: string;
  charactersUpdated: string;
  missingFields: string;
  confirmationRequired: string;
  queued: string;
  insufficientCredits: string;
};

const STORY_CREATION_COPY: Record<string, StoryCreationCopy> = {
  'en-US': {
    draftCreated: 'Story draft created.',
    draftUpdated: 'Story draft updated.',
    charactersUpdated: 'Story characters updated.',
    missingFields: 'Collect the missing required fields before generation.',
    confirmationRequired: 'Ask for confirmation before spending credits and starting generation.',
    queued: 'Story generation was queued successfully.',
    insufficientCredits: 'Not enough credits to start generation.',
  },
  'pt-PT': {
    draftCreated: 'Rascunho da historia criado.',
    draftUpdated: 'Rascunho da historia atualizado.',
    charactersUpdated: 'Personagens da historia atualizados.',
    missingFields: 'Recolha os campos obrigatorios em falta antes da geracao.',
    confirmationRequired: 'Peca confirmacao antes de gastar creditos e iniciar a geracao.',
    queued: 'A geracao da historia foi colocada em fila.',
    insufficientCredits: 'Creditos insuficientes para iniciar a geracao.',
  },
  'es-ES': {
    draftCreated: 'Borrador de historia creado.',
    draftUpdated: 'Borrador de historia actualizado.',
    charactersUpdated: 'Personajes de la historia actualizados.',
    missingFields: 'Recoge los campos obligatorios pendientes antes de generar.',
    confirmationRequired: 'Pide confirmacion antes de gastar creditos e iniciar la generacion.',
    queued: 'La generacion de la historia se ha encolado correctamente.',
    insufficientCredits: 'No hay creditos suficientes para iniciar la generacion.',
  },
  'fr-FR': {
    draftCreated: "Brouillon d'histoire cree.",
    draftUpdated: "Brouillon d'histoire mis a jour.",
    charactersUpdated: "Personnages de l'histoire mis a jour.",
    missingFields: 'Collectez les champs obligatoires manquants avant la generation.',
    confirmationRequired:
      'Demandez une confirmation avant de depenser des credits et de lancer la generation.',
    queued: "La generation de l'histoire a ete mise en file d'attente.",
    insufficientCredits: 'Credits insuffisants pour lancer la generation.',
  },
  'de-DE': {
    draftCreated: 'Story-Entwurf erstellt.',
    draftUpdated: 'Story-Entwurf aktualisiert.',
    charactersUpdated: 'Story-Figuren aktualisiert.',
    missingFields: 'Erganzte Pflichtfelder werden vor der Generierung benotigt.',
    confirmationRequired:
      'Bitte Bestatigung einholen, bevor Credits verbraucht und die Generierung gestartet wird.',
    queued: 'Die Story-Generierung wurde in die Warteschlange gestellt.',
    insufficientCredits: 'Nicht genug Credits fur die Generierung.',
  },
};

const STORY_READING_COPY: Record<string, StoryReadingCopy> = {
  'en-US': {
    overviewReady: 'Story reading overview retrieved.',
    chapterReady: 'Story chapter retrieved.',
    chapterNotFound: 'Requested chapter was not found.',
    noChaptersAvailable: 'This story has no readable chapters yet.',
    privateAuthRequired: 'Authentication is required to read this private story.',
    guidance: 'Use chapter tools to continue reading or jump to a specific chapter.',
  },
  'pt-PT': {
    overviewReady: 'Visao geral de leitura obtida.',
    chapterReady: 'Capitulo da historia obtido.',
    chapterNotFound: 'O capitulo pedido nao foi encontrado.',
    noChaptersAvailable: 'Esta historia ainda nao tem capitulos para leitura.',
    privateAuthRequired: 'E necessaria autenticacao para ler esta historia privada.',
    guidance: 'Use as ferramentas de capitulos para continuar ou saltar para um capitulo.',
  },
  'es-ES': {
    overviewReady: 'Resumen de lectura recuperado.',
    chapterReady: 'Capitulo de la historia recuperado.',
    chapterNotFound: 'No se encontro el capitulo solicitado.',
    noChaptersAvailable: 'Esta historia aun no tiene capitulos para leer.',
    privateAuthRequired: 'Se requiere autenticacion para leer esta historia privada.',
    guidance: 'Usa las herramientas de capitulos para continuar o saltar a otro capitulo.',
  },
  'fr-FR': {
    overviewReady: 'Vue de lecture recuperee.',
    chapterReady: "Chapitre de l'histoire recupere.",
    chapterNotFound: 'Le chapitre demande est introuvable.',
    noChaptersAvailable: "Cette histoire n'a pas encore de chapitres lisibles.",
    privateAuthRequired: 'Une authentification est requise pour lire cette histoire privee.',
    guidance:
      'Utilisez les outils de chapitre pour continuer la lecture ou aller a un chapitre precis.',
  },
  'de-DE': {
    overviewReady: 'Leseubersicht geladen.',
    chapterReady: 'Kapitel geladen.',
    chapterNotFound: 'Das angeforderte Kapitel wurde nicht gefunden.',
    noChaptersAvailable: 'Diese Story hat noch keine lesbaren Kapitel.',
    privateAuthRequired: 'Zum Lesen dieser privaten Story ist eine Anmeldung erforderlich.',
    guidance: 'Nutze die Kapitel-Tools, um weiterzulesen oder direkt zu einem Kapitel zu springen.',
  },
};

const STORY_LISTENING_COPY: Record<string, StoryListeningCopy> = {
  'en-US': {
    statusReady: 'Story listening status retrieved.',
    chapterReady: 'Story audio chapter is ready.',
    chapterNotFound: 'Requested audio chapter was not found.',
    audioUnavailable: 'No audiobook is available for this story yet.',
    generationPreview: 'Audiobook generation is ready for confirmation.',
    generationQueued: 'Audiobook generation was queued successfully.',
    generationInProgress: 'Audiobook generation is already in progress.',
    insufficientCredits: 'Not enough credits to generate audiobook.',
    privateAuthRequired: 'Authentication is required to access private story audio.',
    guidance: 'Use audio_status, audio_chapter, and narration_request to manage listening flow.',
  },
  'pt-PT': {
    statusReady: 'Estado de audio da historia obtido.',
    chapterReady: 'Capitulo audio da historia pronto.',
    chapterNotFound: 'O capitulo audio pedido nao foi encontrado.',
    audioUnavailable: 'Ainda nao existe audiobook para esta historia.',
    generationPreview: 'A geracao do audiobook esta pronta para confirmacao.',
    generationQueued: 'A geracao do audiobook foi colocada em fila.',
    generationInProgress: 'A geracao do audiobook ja esta em curso.',
    insufficientCredits: 'Nao ha creditos suficientes para gerar audiobook.',
    privateAuthRequired: 'E necessaria autenticacao para aceder ao audio privado.',
    guidance: 'Use audio_status, audio_chapter e narration_request para gerir o fluxo de audio.',
  },
  'es-ES': {
    statusReady: 'Estado de audio de la historia recuperado.',
    chapterReady: 'Capitulo de audio listo.',
    chapterNotFound: 'No se encontro el capitulo de audio solicitado.',
    audioUnavailable: 'Aun no hay audiobook disponible para esta historia.',
    generationPreview: 'La generacion de audiobook esta lista para confirmacion.',
    generationQueued: 'La generacion de audiobook se ha encolado correctamente.',
    generationInProgress: 'La generacion de audiobook ya esta en curso.',
    insufficientCredits: 'No hay creditos suficientes para generar audiobook.',
    privateAuthRequired: 'Se requiere autenticacion para acceder al audio privado.',
    guidance:
      'Usa audio_status, audio_chapter y narration_request para gestionar el flujo de audio.',
  },
  'fr-FR': {
    statusReady: "Statut d'ecoute de l'histoire recupere.",
    chapterReady: "Le chapitre audio de l'histoire est pret.",
    chapterNotFound: 'Le chapitre audio demande est introuvable.',
    audioUnavailable: "Aucun audiobook n'est disponible pour cette histoire.",
    generationPreview: "La generation d'audiobook est prete pour confirmation.",
    generationQueued: "La generation d'audiobook a ete mise en file d'attente.",
    generationInProgress: "La generation d'audiobook est deja en cours.",
    insufficientCredits: "Credits insuffisants pour generer l'audiobook.",
    privateAuthRequired: "Une authentification est requise pour l'audio prive.",
    guidance: "Utilisez audio_status, audio_chapter et narration_request pour gerer l'ecoute.",
  },
  'de-DE': {
    statusReady: 'Audio-Status der Story geladen.',
    chapterReady: 'Audio-Kapitel ist bereit.',
    chapterNotFound: 'Das angeforderte Audio-Kapitel wurde nicht gefunden.',
    audioUnavailable: 'Fur diese Story ist noch kein Audiobook verfugbar.',
    generationPreview: 'Audiobook-Generierung ist zur Bestatigung bereit.',
    generationQueued: 'Audiobook-Generierung wurde in die Warteschlange gestellt.',
    generationInProgress: 'Audiobook-Generierung lauft bereits.',
    insufficientCredits: 'Nicht genug Credits fur die Audiobook-Generierung.',
    privateAuthRequired: 'Authentifizierung ist fur private Story-Audio erforderlich.',
    guidance: 'Nutze audio_status, audio_chapter und narration_request fur den Audio-Ablauf.',
  },
};

const STORY_COACH_COPY: Record<string, StoryCoachCopy> = {
  'en-US': {
    ready: 'Story coaching guidance prepared.',
    faqRouting:
      'This looks like a Mythoria product/account question. Use mythoria.help.search for grounded FAQ answers.',
    creationRouting:
      'This looks like a direct creation request. Collect required fields and start with mythoria.story.create_draft.',
    coachingGuidance:
      'Keep guidance concise, practical, and aligned to audience/style before starting generation.',
  },
  'pt-PT': {
    ready: 'Orientacao de escrita preparada.',
    faqRouting:
      'Isto parece uma pergunta de produto/conta Mythoria. Use mythoria.help.search para respostas fiaveis.',
    creationRouting:
      'Isto parece um pedido direto de criacao. Recolha os campos obrigatorios e comece em mythoria.story.create_draft.',
    coachingGuidance:
      'Mantenha orientacoes curtas, praticas e alinhadas ao publico/estilo antes da geracao.',
  },
  'es-ES': {
    ready: 'Guia de escritura preparada.',
    faqRouting:
      'Esto parece una pregunta de producto/cuenta de Mythoria. Usa mythoria.help.search para respuestas fiables.',
    creationRouting:
      'Esto parece una solicitud directa de creacion. Reune los campos obligatorios y empieza con mythoria.story.create_draft.',
    coachingGuidance:
      'Mantener sugerencias concisas, practicas y alineadas con publico/estilo antes de generar.',
  },
  'fr-FR': {
    ready: "Guide d'ecriture prepare.",
    faqRouting:
      'Cela ressemble a une question produit/compte Mythoria. Utilisez mythoria.help.search pour des reponses fiables.',
    creationRouting:
      'Cela ressemble a une demande de creation directe. Collectez les champs requis puis demarrez avec mythoria.story.create_draft.',
    coachingGuidance:
      'Gardez les conseils concis, concrets et alignes sur le public/le style avant la generation.',
  },
  'de-DE': {
    ready: 'Schreib-Coaching vorbereitet.',
    faqRouting:
      'Das sieht nach einer Mythoria Produkt-/Kontofrage aus. Nutze mythoria.help.search fur verlassliche FAQ-Antworten.',
    creationRouting:
      'Das sieht nach einem direkten Erstellungswunsch aus. Pflichtfelder sammeln und mit mythoria.story.create_draft starten.',
    coachingGuidance:
      'Hinweise kurz, praktisch und passend zu Zielgruppe/Stil halten, bevor generiert wird.',
  },
};

const STORY_SHARING_COPY: Record<string, StorySharingCopy> = {
  'en-US': {
    stateReady: 'Story sharing state retrieved.',
    linkCreated: 'Sharing link prepared.',
    linkRevoked: 'Sharing access updated.',
    publicConfirmationRequired:
      'Public sharing requires explicit confirmation because the story becomes externally visible.',
    revokeConfirmationRequired:
      'Revoking sharing access is a destructive action. Confirm before proceeding.',
  },
  'pt-PT': {
    stateReady: 'Estado de partilha da historia obtido.',
    linkCreated: 'Ligacao de partilha preparada.',
    linkRevoked: 'Acesso de partilha atualizado.',
    publicConfirmationRequired:
      'A partilha publica exige confirmacao explicita porque a historia fica visivel externamente.',
    revokeConfirmationRequired:
      'Revogar partilha e uma acao destrutiva. Confirme antes de continuar.',
  },
  'es-ES': {
    stateReady: 'Estado de comparticion de la historia recuperado.',
    linkCreated: 'Enlace de comparticion preparado.',
    linkRevoked: 'Acceso de comparticion actualizado.',
    publicConfirmationRequired:
      'Compartir en publico requiere confirmacion explicita porque la historia pasa a ser visible externamente.',
    revokeConfirmationRequired:
      'Revocar comparticion es una accion destructiva. Confirma antes de continuar.',
  },
  'fr-FR': {
    stateReady: "Etat de partage de l'histoire recupere.",
    linkCreated: 'Lien de partage prepare.',
    linkRevoked: 'Acces de partage mis a jour.',
    publicConfirmationRequired:
      "Le partage public exige une confirmation explicite car l'histoire devient visible a l'exterieur.",
    revokeConfirmationRequired:
      'La revocation du partage est une action destructive. Confirmez avant de continuer.',
  },
  'de-DE': {
    stateReady: 'Freigabestatus der Story geladen.',
    linkCreated: 'Freigabelink vorbereitet.',
    linkRevoked: 'Freigabezugriff aktualisiert.',
    publicConfirmationRequired:
      'Offentliches Teilen erfordert eine explizite Bestatigung, da die Story extern sichtbar wird.',
    revokeConfirmationRequired:
      'Das Widerrufen von Freigaben ist eine destruktive Aktion. Vorher bestatigen.',
  },
};

const CREDIT_ELIGIBILITY_COPY: Record<string, CreditEligibilityCopy> = {
  'en-US': {
    eligibilityReady: 'Credit eligibility check completed.',
    insufficientCredits: 'Insufficient credits for this action.',
    eligible: 'User has enough credits for this action.',
    policyGuidance:
      'If credits are insufficient, direct the user to Mythoria web account billing; do not execute in-chat digital credit purchases.',
  },
  'pt-PT': {
    eligibilityReady: 'Verificacao de elegibilidade de creditos concluida.',
    insufficientCredits: 'Creditos insuficientes para esta acao.',
    eligible: 'O utilizador tem creditos suficientes para esta acao.',
    policyGuidance:
      'Se os creditos forem insuficientes, direcione para a faturacao da conta web Mythoria; nao execute compras digitais no chat.',
  },
  'es-ES': {
    eligibilityReady: 'Comprobacion de elegibilidad de creditos completada.',
    insufficientCredits: 'No hay creditos suficientes para esta accion.',
    eligible: 'El usuario tiene creditos suficientes para esta accion.',
    policyGuidance:
      'Si los creditos no alcanzan, deriva al usuario a la facturacion de su cuenta web de Mythoria; no hagas compras digitales dentro del chat.',
  },
  'fr-FR': {
    eligibilityReady: "Verification d'eligibilite des credits terminee.",
    insufficientCredits: 'Credits insuffisants pour cette action.',
    eligible: "L'utilisateur dispose de credits suffisants pour cette action.",
    policyGuidance:
      "Si les credits sont insuffisants, redirigez l'utilisateur vers la facturation du compte web Mythoria ; n'effectuez pas d'achat digital dans le chat.",
  },
  'de-DE': {
    eligibilityReady: 'Prufung der Credit-Berechtigung abgeschlossen.',
    insufficientCredits: 'Nicht genug Credits fur diese Aktion.',
    eligible: 'Der Nutzer hat genug Credits fur diese Aktion.',
    policyGuidance:
      'Bei zu wenigen Credits auf die Abrechnung im Mythoria-Webkonto verweisen; keine digitalen In-Chat-Kaufe ausfuhren.',
  },
};

const JOB_STATUS_COPY: Record<string, JobStatusCopy> = {
  'en-US': {
    statusReady: 'Job status retrieved.',
    invalidJobId: 'Job ID is invalid or not recognized.',
    guidance:
      'Use the normalized state/progress to explain next steps and call follow-up read/listen/export tools when complete.',
  },
  'pt-PT': {
    statusReady: 'Estado do job obtido.',
    invalidJobId: 'Job ID invalido ou nao reconhecido.',
    guidance:
      'Use estado/progresso normalizados para orientar proximos passos e chamar ferramentas de leitura/audio/export quando concluir.',
  },
  'es-ES': {
    statusReady: 'Estado del job recuperado.',
    invalidJobId: 'Job ID invalido o no reconocido.',
    guidance:
      'Usa estado/progreso normalizados para indicar siguientes pasos y llamar herramientas de lectura/audio/export al completar.',
  },
  'fr-FR': {
    statusReady: 'Statut du job recupere.',
    invalidJobId: 'Job ID invalide ou non reconnu.',
    guidance:
      "Utilisez l'etat/la progression normalises pour guider la suite et appeler les outils de lecture/audio/export a la fin.",
  },
  'de-DE': {
    statusReady: 'Job-Status geladen.',
    invalidJobId: 'Job-ID ist ungueltig oder unbekannt.',
    guidance:
      'Nutze normalisierten Status/Fortschritt fur die nachsten Schritte und starte danach Lesen/Audio/Export-Tools.',
  },
};

function getStoryCreationCopy(locale: string): StoryCreationCopy {
  return STORY_CREATION_COPY[locale] ?? STORY_CREATION_COPY['en-US'];
}

function getStoryReadingCopy(locale: string): StoryReadingCopy {
  return STORY_READING_COPY[locale] ?? STORY_READING_COPY['en-US'];
}

function getStoryListeningCopy(locale: string): StoryListeningCopy {
  return STORY_LISTENING_COPY[locale] ?? STORY_LISTENING_COPY['en-US'];
}

function getStoryCoachCopy(locale: string): StoryCoachCopy {
  return STORY_COACH_COPY[locale] ?? STORY_COACH_COPY['en-US'];
}

function getStorySharingCopy(locale: string): StorySharingCopy {
  return STORY_SHARING_COPY[locale] ?? STORY_SHARING_COPY['en-US'];
}

function getCreditEligibilityCopy(locale: string): CreditEligibilityCopy {
  return CREDIT_ELIGIBILITY_COPY[locale] ?? CREDIT_ELIGIBILITY_COPY['en-US'];
}

function getJobStatusCopy(locale: string): JobStatusCopy {
  return JOB_STATUS_COPY[locale] ?? JOB_STATUS_COPY['en-US'];
}

function getStoryLibraryCopy(locale: string): StoryLibraryCopy {
  return STORY_LIBRARY_COPY[locale] ?? STORY_LIBRARY_COPY['en-US'];
}

function encodeStoryListCursor(payload: StoryListCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeStoryListCursor(
  cursor: string,
  expectedSortBy: StoryLibrarySortBy,
  expectedSortDirection: StoryLibrarySortDirection,
): StoryListCursorPayload {
  let parsed: unknown;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    parsed = JSON.parse(decoded) as unknown;
  } catch {
    throw new McpToolUserError('Invalid cursor. Please request the first page again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new McpToolUserError('Invalid cursor. Please request the first page again.');
  }

  const candidate = parsed as Partial<StoryListCursorPayload>;
  const offset = candidate.offset;
  const sortBy = candidate.sortBy;
  const sortDirection = candidate.sortDirection;

  const isValidOffset =
    typeof offset === 'number' &&
    Number.isInteger(offset) &&
    Number.isFinite(offset) &&
    offset >= 0;
  const isValidSortBy =
    typeof sortBy === 'string' && (STORY_LIBRARY_SORT_FIELDS as readonly string[]).includes(sortBy);
  const isValidSortDirection =
    typeof sortDirection === 'string' &&
    (STORY_LIBRARY_SORT_DIRECTIONS as readonly string[]).includes(sortDirection);

  if (!isValidOffset || !isValidSortBy || !isValidSortDirection) {
    throw new McpToolUserError('Invalid cursor. Please request the first page again.');
  }

  if (sortBy !== expectedSortBy || sortDirection !== expectedSortDirection) {
    throw new McpToolUserError(
      'Cursor does not match the current sorting options. Request a fresh list first.',
    );
  }

  return {
    offset,
    sortBy: sortBy as StoryLibrarySortBy,
    sortDirection: sortDirection as StoryLibrarySortDirection,
  };
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function compareStoriesForLibrary(
  a: AuthorStoryRecord,
  b: AuthorStoryRecord,
  sortBy: StoryLibrarySortBy,
  direction: StoryLibrarySortDirection,
): number {
  let left: string | number = 0;
  let right: string | number = 0;

  if (sortBy === 'updatedAt') {
    left = new Date(a.updatedAt ?? a.createdAt).getTime();
    right = new Date(b.updatedAt ?? b.createdAt).getTime();
  } else if (sortBy === 'createdAt') {
    left = new Date(a.createdAt).getTime();
    right = new Date(b.createdAt).getTime();
  } else {
    left = a.title.toLowerCase();
    right = b.title.toLowerCase();
  }

  if (left < right) return direction === 'asc' ? -1 : 1;
  if (left > right) return direction === 'asc' ? 1 : -1;

  const tieLeft = new Date(a.updatedAt ?? a.createdAt).getTime();
  const tieRight = new Date(b.updatedAt ?? b.createdAt).getTime();
  if (tieLeft < tieRight) return direction === 'asc' ? -1 : 1;
  if (tieLeft > tieRight) return direction === 'asc' ? 1 : -1;

  return a.storyId.localeCompare(b.storyId);
}

function getStoryMatchScore(story: AuthorStoryRecord, query: string): number | null {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return null;

  const title = normalizeSearchText(story.title ?? '');
  const slug = normalizeSearchText(story.slug ?? '');

  if (story.storyId === query) return 0;
  if (title === normalizedQuery) return 1;
  if (slug && slug === normalizedQuery) return 2;
  if (title.startsWith(normalizedQuery)) return 3;
  if (slug && slug.startsWith(normalizedQuery)) return 4;
  if (title.includes(normalizedQuery)) return 5;
  if (slug && slug.includes(normalizedQuery)) return 6;

  return null;
}

function resolveStoryStatusFilters(
  status: StoryStatusValue | StoryStatusValue[] | undefined,
): StoryStatusValue[] | null {
  if (!status) return null;
  return Array.isArray(status) ? status : [status];
}

function filterStoryLibrary(
  stories: AuthorStoryRecord[],
  options: {
    includeTemporary: boolean;
    statusFilters: StoryStatusValue[] | null;
    storyLanguage?: string;
    targetAudience?: TargetAudience;
    graphicalStyle?: GraphicalStyle;
    hasAudio?: boolean;
    query?: string | null;
  },
): AuthorStoryRecord[] {
  const normalizedLanguage = options.storyLanguage?.trim().toLowerCase();
  const normalizedQuery = options.query ? normalizeSearchText(options.query) : null;
  const shouldIncludeTemporary =
    options.includeTemporary || Boolean(options.statusFilters?.includes('temporary'));

  return stories.filter((story) => {
    const status = story.status as StoryStatusValue;
    if (!shouldIncludeTemporary && status === 'temporary') {
      return false;
    }
    if (options.statusFilters && !options.statusFilters.includes(status)) {
      return false;
    }
    if (
      normalizedLanguage &&
      (!story.storyLanguage || story.storyLanguage.toLowerCase() !== normalizedLanguage)
    ) {
      return false;
    }
    if (options.targetAudience && story.targetAudience !== options.targetAudience) {
      return false;
    }
    if (options.graphicalStyle && story.graphicalStyle !== options.graphicalStyle) {
      return false;
    }
    if (options.hasAudio !== undefined && Boolean(story.hasAudio) !== options.hasAudio) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = `${story.title} ${story.slug ?? ''}`;
      if (!normalizeSearchText(haystack).includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

function buildStoryLibraryActions(
  story: AuthorStoryRecord,
  locale: string,
  copy: StoryLibraryCopy,
): StoryLibraryAction[] {
  const actions: StoryLibraryAction[] = [];
  const readUrl = resolveAuthorStoryReadUrl(locale, story.storyId);
  const listenUrl = resolveAuthorStoryListenUrl(locale, story.storyId);
  const editUrl = resolveAuthorStoryEditUrl(
    locale,
    story.storyId,
    story.status as StoryStatusValue,
  );

  if (story.status === 'published') {
    actions.push({
      id: 'read',
      label: copy.actionLabels.read,
      available: true,
      reason: 'Story is published and ready to read.',
      reasonCode: 'story_published',
      url: readUrl,
    });
    actions.push({
      id: 'listen',
      label: copy.actionLabels.listen,
      available: story.hasAudio === true,
      reason:
        story.hasAudio === true
          ? 'Audio is available for this story.'
          : 'Audio is not available yet for this story.',
      reasonCode: story.hasAudio === true ? 'audio_available' : 'audio_missing',
      ...(story.hasAudio === true ? { url: listenUrl } : {}),
    });
    if (!story.hasAudio) {
      actions.push({
        id: 'generateAudiobook',
        label: copy.actionLabels.generateAudiobook,
        available: true,
        reason: 'You can request narration to generate audio.',
        reasonCode: 'audio_generation_available',
        targetTool: TOOL_NAMES.storyNarrationRequest,
      });
    }
    if (editUrl) {
      actions.push({
        id: 'edit',
        label: copy.actionLabels.edit,
        available: true,
        reason: 'Published stories can be edited.',
        reasonCode: 'edit_available',
        url: editUrl,
      });
    }
    actions.push({
      id: 'share',
      label: copy.actionLabels.share,
      available: true,
      reason: 'Published stories can be shared.',
      reasonCode: 'share_available',
      url: story.slug ? resolveStoryWebUrl(locale, story.slug) : readUrl,
    });
    actions.push({
      id: 'export',
      label: copy.actionLabels.export,
      available: true,
      reason: 'Export can be requested for published stories.',
      reasonCode: 'export_available',
      targetTool: TOOL_NAMES.storyExportRequest,
    });
    actions.push({
      id: 'print',
      label: copy.actionLabels.print,
      available: true,
      reason: 'Print output can be requested for published stories.',
      reasonCode: 'print_available',
      targetTool: TOOL_NAMES.storyPrintRequest,
    });

    return actions;
  }

  if (story.status === 'writing') {
    actions.push({
      id: 'waitForCompletion',
      label: copy.actionLabels.waitForCompletion,
      available: true,
      reason: 'Story generation is still in progress.',
      reasonCode: 'generation_in_progress',
    });
    return actions;
  }

  if (editUrl) {
    actions.push({
      id: 'resumeDraft',
      label: copy.actionLabels.resumeDraft,
      available: true,
      reason: 'Draft/temporary stories should be completed before publishing.',
      reasonCode: 'draft_edit_available',
      url: editUrl,
    });
  }
  actions.push({
    id: 'edit',
    label: copy.actionLabels.edit,
    available: editUrl !== null,
    reason: 'Continue editing to finish the story.',
    reasonCode: editUrl ? 'edit_available' : 'edit_unavailable',
    ...(editUrl ? { url: editUrl } : {}),
  });

  return actions;
}

function buildStoryLibraryEntry(story: AuthorStoryRecord, locale: string, copy: StoryLibraryCopy) {
  const readUrl = resolveAuthorStoryReadUrl(locale, story.storyId);
  const listenUrl = resolveAuthorStoryListenUrl(locale, story.storyId);
  const editUrl = resolveAuthorStoryEditUrl(
    locale,
    story.storyId,
    story.status as StoryStatusValue,
  );

  return {
    id: story.storyId,
    title: story.title,
    status: story.status,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt ?? story.createdAt,
    language: story.storyLanguage,
    targetAudience: story.targetAudience,
    novelStyle: story.novelStyle,
    graphicalStyle: story.graphicalStyle,
    chapterCount: story.chapterCount ?? null,
    hasAudio: Boolean(story.hasAudio),
    storyGenerationStatus: story.storyGenerationStatus ?? null,
    storyGenerationCompletedPercentage: story.storyGenerationCompletedPercentage ?? 0,
    isPublic: story.isPublic,
    isFeatured: story.isFeatured,
    slug: story.slug,
    urls: {
      readUrl,
      listenUrl: story.hasAudio ? listenUrl : null,
      editUrl,
      publicReadUrl: story.slug ? resolveStoryWebUrl(locale, story.slug) : null,
      publicApiUrl: story.slug ? resolveStoryApiUrl(story.slug) : null,
    },
    nextActions: buildStoryLibraryActions(story, locale, copy),
  };
}

function summarizeChapterText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  let summary = '';
  for (const sentence of sentences) {
    const nextSummary = summary ? `${summary} ${sentence}` : sentence;
    if (nextSummary.length > maxChars) break;
    summary = nextSummary;
    if (summary.length >= Math.floor(maxChars * 0.8)) break;
  }

  if (!summary) {
    return truncateText(normalized, maxChars);
  }

  return summary.length > maxChars ? truncateText(summary, maxChars) : summary;
}

function getChapterWordCount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function resolveChapterOutput(
  chapter: StoryChapterRecord,
  mode: StoryReadMode,
  maxOutputChars: number,
): {
  text: string;
  summary: string;
  plainText: string;
  wordCount: number;
  truncated: boolean;
} {
  const plainText = stripHtml(chapter.htmlContent ?? '');
  const wordCount = getChapterWordCount(plainText);
  const summary = summarizeChapterText(plainText, Math.min(maxOutputChars, 900));
  const outputText =
    mode === 'summary'
      ? summary
      : mode === 'excerpt'
        ? truncateText(plainText, maxOutputChars)
        : truncateText(plainText, maxOutputChars);

  return {
    text: outputText,
    summary,
    plainText,
    wordCount,
    truncated: plainText.length > outputText.length,
  };
}

function resolveStoryReadAccess(
  story: StoryRecord,
  authContext: McpAuthContext,
  copy: StoryReadingCopy,
): 'owner' | 'public' {
  if (authContext.author?.authorId === story.authorId) {
    return 'owner';
  }

  if (story.isPublic) {
    return 'public';
  }

  if (!authContext.author) {
    if (authContext.authError) {
      throw new McpAuthError(
        authContext.authError.message,
        authContext.authError.status,
        authContext.authError.oauthError,
        [PROTECTED_TOOL_SCOPE],
      );
    }
    throw new McpAuthError(copy.privateAuthRequired, 401, 'invalid_token', [PROTECTED_TOOL_SCOPE]);
  }

  throw new McpToolUserError('Story not found or access denied.');
}

function findChapterByNumber(
  chapters: StoryChapterRecord[],
  chapterNumber: number,
): StoryChapterRecord | null {
  return chapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null;
}

function buildChapterNavigation(chapters: StoryChapterRecord[], chapterNumber: number) {
  const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const currentIndex = sorted.findIndex((chapter) => chapter.chapterNumber === chapterNumber);
  if (currentIndex < 0) {
    return {
      hasPrevious: false,
      hasNext: false,
      previousChapterNumber: null,
      nextChapterNumber: null,
    };
  }

  return {
    hasPrevious: currentIndex > 0,
    hasNext: currentIndex < sorted.length - 1,
    previousChapterNumber:
      currentIndex > 0 ? (sorted[currentIndex - 1]?.chapterNumber ?? null) : null,
    nextChapterNumber:
      currentIndex < sorted.length - 1 ? (sorted[currentIndex + 1]?.chapterNumber ?? null) : null,
  };
}

function buildStoryReadingUrls(
  story: StoryRecord,
  locale: string,
  chapterNumber: number | null,
  accessLevel: 'owner' | 'public',
) {
  const privateOverviewUrl = resolveAuthorStoryReadUrl(locale, story.storyId);
  const privateChapterUrl =
    chapterNumber !== null
      ? resolveAuthorStoryReadChapterUrl(locale, story.storyId, chapterNumber)
      : null;
  const publicOverviewUrl = story.slug ? resolveStoryWebUrl(locale, story.slug) : null;
  const publicChapterUrl =
    chapterNumber !== null && story.slug
      ? resolvePublicStoryChapterUrl(locale, story.slug, chapterNumber)
      : null;
  const preferredOverviewUrl = accessLevel === 'owner' ? privateOverviewUrl : publicOverviewUrl;
  const preferredChapterUrl = accessLevel === 'owner' ? privateChapterUrl : publicChapterUrl;

  return {
    privateOverviewUrl,
    privateChapterUrl,
    publicOverviewUrl,
    publicChapterUrl,
    preferredOverviewUrl,
    preferredChapterUrl,
    publicApiUrl: story.slug ? resolveStoryApiUrl(story.slug) : null,
  };
}

function normalizeAudioUri(uri: unknown): string | null {
  if (typeof uri !== 'string') return null;
  const trimmed = uri.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractAudiobookEntriesFromStory(story: StoryRecord): AudiobookChapterEntry[] {
  const uriData = story.audiobookUri;
  if (!uriData || typeof uriData !== 'object') return [];

  if (Array.isArray(uriData)) {
    return uriData
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const entry = item as {
          audioUri?: unknown;
          chapterTitle?: unknown;
          duration?: unknown;
          imageUri?: unknown;
        };
        const audioUri = normalizeAudioUri(entry.audioUri);
        if (!audioUri) return null;

        return {
          chapterNumber: index + 1,
          title:
            typeof entry.chapterTitle === 'string' && entry.chapterTitle.trim().length > 0
              ? entry.chapterTitle.trim()
              : `Chapter ${index + 1}`,
          audioUri,
          duration:
            typeof entry.duration === 'number' &&
            Number.isFinite(entry.duration) &&
            entry.duration > 0
              ? entry.duration
              : null,
          imageUri: normalizeAudioUri(entry.imageUri),
        } satisfies AudiobookChapterEntry;
      })
      .filter((entry): entry is AudiobookChapterEntry => Boolean(entry));
  }

  const mapped = uriData as Record<string, unknown>;
  const chapterCandidates = Object.keys(mapped)
    .map((key) => {
      if (key.startsWith('chapter_')) {
        const parsed = Number.parseInt(key.replace('chapter_', ''), 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      }
      if (/^\d+$/.test(key)) {
        const parsed = Number.parseInt(key, 10);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
      }
      return null;
    })
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  const uniqueChapterNumbers = [...new Set(chapterCandidates)];
  return uniqueChapterNumbers.flatMap((chapterNumber) => {
    const chapterKey = `chapter_${chapterNumber}`;
    const numericKey = String(chapterNumber);
    const audioUri = normalizeAudioUri(mapped[chapterKey] ?? mapped[numericKey]);
    if (!audioUri) return [];
    return [
      {
        chapterNumber,
        title: `Chapter ${chapterNumber}`,
        audioUri,
        duration: null,
        imageUri: null,
      } satisfies AudiobookChapterEntry,
    ];
  });
}

function buildAudiobookChapterEntries(
  story: StoryRecord,
  chapters: StoryChapterRecord[],
): AudiobookChapterEntry[] {
  const chapterMap = new Map<number, AudiobookChapterEntry>();
  const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  for (const chapter of sortedChapters) {
    const audioUri = normalizeAudioUri(chapter.audioUri);
    if (!audioUri) continue;

    chapterMap.set(chapter.chapterNumber, {
      chapterNumber: chapter.chapterNumber,
      title: chapter.title,
      audioUri,
      duration: null,
      imageUri: normalizeAudioUri(chapter.imageUri),
    });
  }

  for (const entry of extractAudiobookEntriesFromStory(story)) {
    if (!chapterMap.has(entry.chapterNumber)) {
      chapterMap.set(entry.chapterNumber, entry);
      continue;
    }

    const existing = chapterMap.get(entry.chapterNumber);
    if (!existing) continue;
    chapterMap.set(entry.chapterNumber, {
      ...existing,
      duration: existing.duration ?? entry.duration,
      imageUri: existing.imageUri ?? entry.imageUri,
    });
  }

  return [...chapterMap.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function resolveStoryAudioGenerationStatus(story: StoryRecord): StoryAudioGenerationStatus {
  if (story.audiobookStatus === 'generating') return 'generating';
  if (story.audiobookStatus === 'failed') return 'failed';
  if (story.audiobookStatus === 'completed') return 'completed';
  if (Boolean(story.hasAudio)) return 'completed';
  return 'not_started';
}

function resolveStoryAudioAccess(
  story: StoryRecord,
  authContext: McpAuthContext,
  copy: StoryListeningCopy,
): StoryAudioAccessLevel {
  if (authContext.author?.authorId === story.authorId) {
    return 'owner';
  }

  if (story.isPublic) {
    return 'public';
  }

  if (!authContext.author) {
    if (authContext.authError) {
      throw new McpAuthError(
        authContext.authError.message,
        authContext.authError.status,
        authContext.authError.oauthError,
        [PROTECTED_TOOL_SCOPE],
      );
    }
    throw new McpAuthError(copy.privateAuthRequired, 401, 'invalid_token', [PROTECTED_TOOL_SCOPE]);
  }

  throw new McpToolUserError('Story not found or access denied.');
}

async function resolveStoryFromIdentifier(input: {
  storyId?: string;
  slug?: string;
}): Promise<StoryRecord> {
  const storyId = sanitizeOptionalText(input.storyId);
  const slug = sanitizeOptionalText(input.slug);

  if (storyId) {
    const story = await storyService.getStoryById(storyId);
    if (story) return story;
  }

  if (slug && typeof storyService.getStoryBySlug === 'function') {
    const story = await storyService.getStoryBySlug(slug);
    if (story) return story as StoryRecord;
  }

  throw new McpToolUserError('Story not found.');
}

function getRequiredFieldLabels(locale: string) {
  return REQUIRED_STORY_FIELD_LABELS[locale] ?? REQUIRED_STORY_FIELD_LABELS['en-US'];
}

function sanitizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getChapterCountForAudience(targetAudience: TargetAudience | null | undefined): number {
  if (!targetAudience) return DEFAULT_CHAPTER_COUNT;
  return TARGET_AUDIENCE_CHAPTER_COUNT[targetAudience] ?? DEFAULT_CHAPTER_COUNT;
}

function normalizeStoryLanguage(storyLanguage: string | undefined, locale: string): string {
  if (storyLanguage && storyLanguage.trim().length > 0) {
    return storyLanguage.trim();
  }
  return resolveLocale(locale);
}

function getMissingRequiredStoryFields(story: StoryRecord): RequiredStoryField[] {
  return REQUIRED_STORY_FIELDS.filter((field) => {
    if (field === 'title') return !story.title?.trim();
    if (field === 'targetAudience') return !story.targetAudience;
    if (field === 'novelStyle') return !story.novelStyle;
    if (field === 'graphicalStyle') return !story.graphicalStyle;
    return false;
  });
}

function toFieldPrompt(field: RequiredStoryField): string {
  if (field === 'title') return 'Ask the user for a title or provisional title.';
  if (field === 'targetAudience') return 'Ask who this story is for (age range).';
  if (field === 'novelStyle') return 'Ask which narrative style they want (for example fantasy).';
  return 'Ask which graphical style they want (for example watercolor).';
}

function buildStoryDraftState(story: StoryRecord, locale: string) {
  const missingFields = getMissingRequiredStoryFields(story);
  const fieldLabels = getRequiredFieldLabels(locale);

  return {
    storyId: story.storyId,
    status: story.status,
    title: story.title,
    storyLanguage: story.storyLanguage,
    targetAudience: story.targetAudience,
    novelStyle: story.novelStyle,
    graphicalStyle: story.graphicalStyle,
    literaryPersona: story.literaryPersona,
    chapterCount: story.chapterCount,
    place: story.place,
    plotDescription: story.plotDescription,
    additionalRequests: story.additionalRequests,
    imageGenerationInstructions: story.imageGenerationInstructions,
    customAuthor: story.customAuthor,
    dedicationMessage: story.dedicationMessage,
    readyToGenerate: missingFields.length === 0,
    missingRequiredFields: missingFields,
    missingRequiredFieldLabels: missingFields.map((field) => fieldLabels[field]),
    promptHints: missingFields.map((field) => ({
      field,
      prompt: toFieldPrompt(field),
    })),
  };
}

function ensureStoryOwnership(
  story: Awaited<ReturnType<typeof storyService.getStoryById>>,
  authorId: string,
): StoryRecord {
  if (!story || story.authorId !== authorId) {
    throw new McpToolUserError('Story not found or access denied.');
  }
  return story;
}

function normalizeGenerationFeatures(
  features?: Partial<StoryGenerationFeatures>,
): StoryGenerationFeatures {
  return {
    ebook: features?.ebook ?? true,
    printed: features?.printed ?? false,
    audiobook: features?.audiobook ?? false,
  };
}

function hasAnyGenerationFeature(features: StoryGenerationFeatures): boolean {
  return features.ebook || features.printed || features.audiobook;
}

function getCreditEventType(
  serviceCode: string,
): 'eBookGeneration' | 'printOrder' | 'audioBookGeneration' {
  if (serviceCode === 'eBookGeneration') return 'eBookGeneration';
  if (serviceCode === 'printOrder') return 'printOrder';
  if (serviceCode === 'audioBookGeneration') return 'audioBookGeneration';
  throw new McpToolUserError(`Unsupported pricing service in credit breakdown: ${serviceCode}`);
}

function getCreditServiceLabel(serviceCode: string): string {
  if (serviceCode === 'eBookGeneration') return 'Digital book generation';
  if (serviceCode === 'printOrder') return 'Printed book order';
  if (serviceCode === 'audioBookGeneration') return 'Audiobook generation';
  return serviceCode;
}

function resolveCreditActionServiceCode(
  action: Exclude<CreditEligibilityAction, 'story_generation'>,
): 'eBookGeneration' | 'audioBookGeneration' | 'printOrder' {
  if (action === 'ebook') return 'eBookGeneration';
  if (action === 'audiobook') return 'audioBookGeneration';
  return 'printOrder';
}

function resolveCreditEligibilityNextTools(action: CreditEligibilityAction): string[] {
  if (action === 'ebook' || action === 'story_generation') {
    return [TOOL_NAMES.storyStartGeneration];
  }
  if (action === 'audiobook') {
    return [TOOL_NAMES.storyNarrationRequest];
  }
  return [TOOL_NAMES.storyPrintRequest];
}

const STORY_COACH_PRODUCT_KEYWORDS = [
  'credit',
  'price',
  'pricing',
  'payment',
  'refund',
  'account',
  'login',
  'sign in',
  'subscription',
  'plan',
  'package',
  'billing',
  'authentication',
  'oauth',
] as const;

const STORY_COACH_CREATION_KEYWORDS = [
  'create',
  'start story',
  'generate now',
  'write now',
  'build story',
  'draft',
  'start generation',
] as const;

const STORY_COACH_AUDIENCE_HINTS: Partial<Record<TargetAudience, string[]>> = {
  [TargetAudience.CHILDREN_0_2]: [
    'Use very short sentences and repeated reassuring words.',
    'Keep one central feeling per scene and avoid complex conflict.',
  ],
  [TargetAudience.CHILDREN_3_6]: [
    'Use clear cause/effect moments and playful repetition.',
    'Keep characters strongly visual and emotionally simple.',
  ],
  [TargetAudience.CHILDREN_7_10]: [
    'Add a concrete mini-goal every chapter.',
    'Use light cliffhangers to keep momentum.',
  ],
  [TargetAudience.CHILDREN_11_14]: [
    'Increase emotional stakes and peer dynamics.',
    'Use chapter endings that raise a new decision.',
  ],
  [TargetAudience.YOUNG_ADULT_15_17]: [
    'Anchor voice in identity, choice, and consequences.',
    'Balance introspection with scene action.',
  ],
  [TargetAudience.ADULT_18_PLUS]: [
    'Lean into layered motives and subtext in dialogue.',
    'Use scene transitions to signal theme progression.',
  ],
  [TargetAudience.ALL_AGES]: [
    'Prefer universal themes (belonging, courage, kindness).',
    'Keep language vivid but accessible.',
  ],
};

const STORY_COACH_STYLE_HINTS: Partial<Record<NovelStyle, string[]>> = {
  [NovelStyle.ADVENTURE]: [
    'Escalate obstacles in a clear sequence.',
    'Keep movement and location changes frequent.',
  ],
  [NovelStyle.FANTASY]: [
    'Define one clear rule of magic early.',
    'Reveal worldbuilding through character goals.',
  ],
  [NovelStyle.MYSTERY]: [
    'Plant clues that can be interpreted two ways.',
    'Alternate discovery beats with quiet deduction beats.',
  ],
  [NovelStyle.ROMANCE]: [
    'Track emotional distance and turning points explicitly.',
    'Use vulnerable dialogue before major decisions.',
  ],
  [NovelStyle.SCIENCE_FICTION]: [
    'Show one concrete impact of technology per scene.',
    'Use constraints of the world to shape plot choices.',
  ],
  [NovelStyle.COMEDY]: [
    'Set up expectations, then subvert with timing.',
    'Keep jokes tied to character voice, not random punchlines.',
  ],
  [NovelStyle.HORROR]: [
    'Withhold certainty and force difficult tradeoffs.',
    'Use sensory details to build dread before reveal.',
  ],
  [NovelStyle.THRILLER]: [
    'End scenes with unresolved risk.',
    'Keep objective, obstacle, and clock visible.',
  ],
};

const DEFAULT_STORY_COACH_HINTS = [
  'Clarify protagonist goal, stakes, and obstacle in one sentence.',
  'Keep each chapter focused on one turning point.',
];

function detectStoryCoachIntent(request: string): StoryCoachIntent {
  const normalized = normalizeSearchText(request);
  if (!normalized) return 'creative_coaching';

  if (STORY_COACH_PRODUCT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'product_info';
  }
  if (STORY_COACH_CREATION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'story_creation_request';
  }
  return 'creative_coaching';
}

function getStoryCoachAudienceHints(targetAudience?: TargetAudience): string[] {
  if (!targetAudience) return DEFAULT_STORY_COACH_HINTS;
  return STORY_COACH_AUDIENCE_HINTS[targetAudience] ?? DEFAULT_STORY_COACH_HINTS;
}

function getStoryCoachStyleHints(novelStyle?: NovelStyle): string[] {
  if (!novelStyle) return DEFAULT_STORY_COACH_HINTS;
  return STORY_COACH_STYLE_HINTS[novelStyle] ?? DEFAULT_STORY_COACH_HINTS;
}

function buildStoryCoachOpeningExample(input: {
  request: string;
  targetAudience?: TargetAudience;
  novelStyle?: NovelStyle;
  tone?: string;
}): string {
  const seed = truncateText(stripHtml(input.request), 120);
  const tone = sanitizeOptionalText(input.tone) ?? 'warm';
  const styleHint =
    input.novelStyle === NovelStyle.MYSTERY
      ? 'A clue appears where it should not exist.'
      : input.novelStyle === NovelStyle.FANTASY
        ? 'A small piece of magic breaks an ordinary routine.'
        : input.novelStyle === NovelStyle.ADVENTURE
          ? 'A problem demands immediate action.'
          : 'A character decision changes the day.';
  const audienceHint =
    input.targetAudience === TargetAudience.CHILDREN_0_2 ||
    input.targetAudience === TargetAudience.CHILDREN_3_6
      ? 'Use simple rhythm and comforting language.'
      : input.targetAudience === TargetAudience.ADULT_18_PLUS
        ? 'Use layered details and subtle tension.'
        : 'Use concrete imagery and a clear emotional hook.';

  return `Opening example (${tone} tone): ${styleHint} Seed idea: "${seed}". ${audienceHint}`;
}

function resolveTrackedJobEtaSeconds(type: TrackedJobType): number {
  if (type === 'story_generation') return 300;
  if (type === 'audiobook_generation') return 240;
  if (type === 'print') return 180;
  return 90;
}

function createTrackedJobDescriptor(
  type: TrackedJobType,
  storyId: string,
  options?: { runId?: string | null; requestedAt?: string },
): TrackedJobDescriptor {
  const requestedAt = options?.requestedAt ?? new Date().toISOString();
  const token: TrackedJobToken = {
    type,
    storyId,
    runId: options?.runId ?? null,
    requestedAt,
  };
  const encoded = Buffer.from(JSON.stringify(token), 'utf8').toString('base64url');

  return {
    ...token,
    jobId: `${TRACKED_JOB_ID_PREFIX}${encoded}`,
    etaSeconds: resolveTrackedJobEtaSeconds(type),
  };
}

function parseTrackedJobId(jobId: string): TrackedJobDescriptor {
  const trimmed = jobId.trim();
  if (!trimmed.startsWith(TRACKED_JOB_ID_PREFIX)) {
    throw new McpToolUserError('Invalid Mythoria job ID format.');
  }

  const encoded = trimmed.slice(TRACKED_JOB_ID_PREFIX.length);
  if (!encoded) {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new McpToolUserError('Invalid Mythoria job ID payload.');
  }

  const candidate = parsed as Partial<TrackedJobToken>;
  const runId =
    candidate.runId === null || candidate.runId === undefined
      ? null
      : typeof candidate.runId === 'string'
        ? candidate.runId
        : null;

  if (
    typeof candidate.type !== 'string' ||
    !(TRACKED_JOB_TYPES as readonly string[]).includes(candidate.type)
  ) {
    throw new McpToolUserError('Invalid job type in job ID.');
  }
  if (typeof candidate.storyId !== 'string' || candidate.storyId.trim().length === 0) {
    throw new McpToolUserError('Invalid story ID in job ID.');
  }
  if (
    typeof candidate.requestedAt !== 'string' ||
    Number.isNaN(Date.parse(candidate.requestedAt))
  ) {
    throw new McpToolUserError('Invalid requestedAt in job ID.');
  }

  return {
    type: candidate.type as TrackedJobType,
    storyId: candidate.storyId,
    runId,
    requestedAt: candidate.requestedAt,
    etaSeconds: resolveTrackedJobEtaSeconds(candidate.type as TrackedJobType),
    jobId: trimmed,
  };
}

function resolveRemainingEtaSeconds(
  requestedAt: string,
  baselineEtaSeconds: number,
): number | null {
  const requestedAtMs = Date.parse(requestedAt);
  if (Number.isNaN(requestedAtMs)) return null;
  const elapsedSeconds = Math.floor((Date.now() - requestedAtMs) / 1000);
  return Math.max(0, baselineEtaSeconds - Math.max(0, elapsedSeconds));
}

function resolveStoryGenerationJobState(story: StoryRecord): {
  state: TrackedJobState;
  progress: number;
  failureCode: string | null;
} {
  const progress = Math.max(0, Math.min(100, story.storyGenerationCompletedPercentage ?? 0));
  const status = story.storyGenerationStatus;

  if (status === 'failed' || status === 'cancelled') {
    return {
      state: 'failed',
      progress: Math.min(progress, 99),
      failureCode: status === 'cancelled' ? 'generation_cancelled' : 'generation_failed',
    };
  }
  if (status === 'completed' || story.status === 'published') {
    return {
      state: 'completed',
      progress: 100,
      failureCode: null,
    };
  }
  if (status === 'running' || story.status === 'writing') {
    return {
      state: 'running',
      progress: Math.max(progress, 5),
      failureCode: null,
    };
  }
  if (status === 'queued') {
    return {
      state: 'queued',
      progress: Math.max(progress, 0),
      failureCode: null,
    };
  }

  return {
    state: 'queued',
    progress: Math.max(progress, 0),
    failureCode: null,
  };
}

function resolveAudiobookJobState(story: StoryRecord): {
  state: TrackedJobState;
  progress: number;
  failureCode: string | null;
  generationStatus: StoryAudioGenerationStatus;
} {
  const generationStatus = resolveStoryAudioGenerationStatus(story);
  if (generationStatus === 'failed') {
    return {
      state: 'failed',
      progress: 0,
      failureCode: 'audiobook_generation_failed',
      generationStatus,
    };
  }
  if (generationStatus === 'completed') {
    return {
      state: 'completed',
      progress: 100,
      failureCode: null,
      generationStatus,
    };
  }
  if (generationStatus === 'generating') {
    return {
      state: 'running',
      progress: story.hasAudio ? 80 : 25,
      failureCode: null,
      generationStatus,
    };
  }
  return {
    state: 'queued',
    progress: 0,
    failureCode: null,
    generationStatus,
  };
}

function resolveExportJobState(story: StoryRecord): {
  state: TrackedJobState;
  progress: number;
  failureCode: string | null;
} {
  const hasInteriorPdf = Boolean(story.interiorPdfUri);
  const hasCoverPdf = Boolean(story.coverPdfUri);

  if (story.status !== 'published') {
    return {
      state: 'failed',
      progress: 0,
      failureCode: 'story_not_published',
    };
  }
  if (hasInteriorPdf && hasCoverPdf) {
    return {
      state: 'completed',
      progress: 100,
      failureCode: null,
    };
  }
  if (hasInteriorPdf || hasCoverPdf) {
    return {
      state: 'running',
      progress: 70,
      failureCode: null,
    };
  }
  return {
    state: 'queued',
    progress: 0,
    failureCode: null,
  };
}

function resolvePrintJobState(printRequestStatus: string | null): {
  state: TrackedJobState;
  progress: number;
  failureCode: string | null;
} {
  if (!printRequestStatus) {
    return {
      state: 'queued',
      progress: 0,
      failureCode: null,
    };
  }
  if (printRequestStatus === 'requested') {
    return {
      state: 'queued',
      progress: 10,
      failureCode: null,
    };
  }
  if (printRequestStatus === 'in_printing' || printRequestStatus === 'packing') {
    return {
      state: 'running',
      progress: printRequestStatus === 'in_printing' ? 45 : 75,
      failureCode: null,
    };
  }
  if (printRequestStatus === 'shipped' || printRequestStatus === 'delivered') {
    return {
      state: 'completed',
      progress: 100,
      failureCode: null,
    };
  }
  if (printRequestStatus === 'cancelled' || printRequestStatus === 'error') {
    return {
      state: 'failed',
      progress: 0,
      failureCode: printRequestStatus === 'cancelled' ? 'print_cancelled' : 'print_error',
    };
  }
  return {
    state: 'queued',
    progress: 0,
    failureCode: null,
  };
}

function resolveJobNextAction(type: TrackedJobType, state: TrackedJobState): string {
  if (state === 'completed') {
    if (type === 'story_generation') return 'Use mythoria.story.read_overview to start reading.';
    if (type === 'audiobook_generation')
      return 'Use mythoria.story.audio_status then mythoria.story.audio_chapter to listen.';
    if (type === 'export') return 'Provide the export link if available or offer to retry export.';
    return 'Confirm shipping/delivery details for the print request.';
  }
  if (state === 'failed') {
    if (type === 'story_generation')
      return 'Check story inputs and retry mythoria.story.start_generation.';
    if (type === 'audiobook_generation')
      return 'Retry mythoria.story.narration_request or choose a different voice.';
    if (type === 'export') return 'Retry mythoria.story.export_request for a fresh export job.';
    return 'Retry mythoria.story.print_request after resolving print issues.';
  }
  if (state === 'running') {
    return 'Wait briefly and call mythoria.jobs.status again to refresh progress.';
  }
  return 'Confirm with the user if they want to wait or run a status refresh now.';
}

function registerDiscoveryTools(server: McpServer, authContext: McpAuthContext) {
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

function registerHelpTools(server: McpServer, authContext: McpAuthContext) {
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

  const storyCoachInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    request: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .describe('User request that needs writing coaching or intent routing.'),
    targetAudience: z.nativeEnum(TargetAudience).optional(),
    novelStyle: z.nativeEnum(NovelStyle).optional(),
    tone: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe('Optional tone preference (for example calm, playful, suspenseful).'),
    constraints: z
      .array(z.string().trim().min(1).max(140))
      .max(8)
      .optional()
      .describe('Optional writing constraints to enforce.'),
    includeExampleOpening: z
      .boolean()
      .optional()
      .describe('Include an example opening guidance line. Defaults to true.'),
  });

  server.registerTool(
    TOOL_NAMES.helpBrowse,
    {
      description:
        'Use this when you want to browse Mythoria FAQ sections and entries before answering a user question.',
      inputSchema: faqListInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof faqListInput>) =>
      executeTool(TOOL_NAMES.helpBrowse, authContext, input, async () => {
        const { locale, section, q } = input;
        const resolvedLocale = resolveLocale(locale);
        const faqData = await faqService.getFaqData(resolvedLocale, section, q);
        const copy = getDiscoveryCopy(resolvedLocale);

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
          guidance: copy.helpGuidance,
        };

        return toJsonContent(payload);
      }),
  );

  server.registerTool(
    TOOL_NAMES.helpSearch,
    {
      description:
        'Use this when a user asks a Mythoria question and you need ranked FAQ matches with fallback context.',
      inputSchema: faqQueryInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof faqQueryInput>) =>
      executeTool(TOOL_NAMES.helpSearch, authContext, input, async () => {
        const { question, locale } = input;
        const resolvedLocale = resolveLocale(locale);
        const trimmedQuestion = question.trim();
        const results = (await faqService.searchFaqs(
          resolvedLocale,
          trimmedQuestion,
        )) as FaqEntryWithSection[];
        const copy = getDiscoveryCopy(resolvedLocale);

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
          guidance: copy.helpGuidance,
          semanticFallbackUsed: results.length === 0,
        };

        return toJsonContent(payload);
      }),
  );

  server.registerTool(
    TOOL_NAMES.coachStoryGuidance,
    {
      description:
        'Use this for writing coaching and intent routing between FAQ, creation, and creative guidance paths.',
      inputSchema: storyCoachInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof storyCoachInput>) =>
      executeTool(TOOL_NAMES.coachStoryGuidance, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryCoachCopy(resolvedLocale);
        const intent = detectStoryCoachIntent(input.request);

        if (intent === 'product_info') {
          return toStructuredToolResult(copy.ready, {
            locale: resolvedLocale,
            intent,
            status: 'route_to_faq',
            request: input.request,
            guidance: copy.faqRouting,
            recommendedNextTools: [TOOL_NAMES.helpSearch, TOOL_NAMES.helpBrowse],
          });
        }

        if (intent === 'story_creation_request') {
          return toStructuredToolResult(copy.ready, {
            locale: resolvedLocale,
            intent,
            status: 'route_to_creation',
            request: input.request,
            guidance: copy.creationRouting,
            recommendedNextTools: [
              TOOL_NAMES.storyCreateDraft,
              TOOL_NAMES.storyUpdateDraft,
              TOOL_NAMES.storyStartGeneration,
            ],
          });
        }

        const audienceHints = getStoryCoachAudienceHints(input.targetAudience);
        const styleHints = getStoryCoachStyleHints(input.novelStyle);
        const constraints = (input.constraints ?? []).map((value) => value.trim()).filter(Boolean);
        const checklist = [
          'Define protagonist goal, stakes, and obstacle in one line.',
          'Plan a chapter turn where the character must make a clear choice.',
          ...audienceHints.slice(0, 1),
          ...styleHints.slice(0, 1),
        ];
        const revisionPrompts = [
          'Which sentence most strongly sets emotional tone in the opening?',
          'Where can you show the conflict earlier with concrete action?',
          'What detail can make the ending feel earned for this audience?',
        ];
        const sampleOpening = input.includeExampleOpening ?? true;

        return toStructuredToolResult(copy.ready, {
          locale: resolvedLocale,
          intent,
          status: 'coaching_ready',
          request: input.request,
          context: {
            targetAudience: input.targetAudience ?? null,
            novelStyle: input.novelStyle ?? null,
            tone: sanitizeOptionalText(input.tone) ?? null,
            constraints,
          },
          coaching: {
            checklist,
            audienceHints,
            styleHints,
            revisionPrompts,
            openingExample: sampleOpening
              ? buildStoryCoachOpeningExample({
                  request: input.request,
                  targetAudience: input.targetAudience,
                  novelStyle: input.novelStyle,
                  tone: input.tone,
                })
              : null,
          },
          guidance: copy.coachingGuidance,
          recommendedNextTools: [
            TOOL_NAMES.storyCreateDraft,
            TOOL_NAMES.storyUpdateDraft,
            TOOL_NAMES.storyAddCharacters,
          ],
        });
      }),
  );
}

function registerStoryTools(server: McpServer, authContext: McpAuthContext) {
  const storyStatusSchema = z.enum(STORY_STATUS_VALUES);
  const storyStatusFilterSchema = z
    .union([storyStatusSchema, z.array(storyStatusSchema).min(1).max(STORY_STATUS_VALUES.length)])
    .optional();

  const storyLibraryFilterSchema = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    includeTemporary: z
      .boolean()
      .optional()
      .describe('Include temporary stories (defaults to false unless explicitly filtered).'),
    status: storyStatusFilterSchema.describe(
      'Filter by one or more story statuses (temporary, draft, writing, published).',
    ),
    storyLanguage: z
      .string()
      .trim()
      .min(2)
      .max(10)
      .optional()
      .describe('Filter by story language, for example en-US.'),
    targetAudience: z
      .nativeEnum(TargetAudience)
      .optional()
      .describe('Filter by story target audience.'),
    graphicalStyle: z.nativeEnum(GraphicalStyle).optional().describe('Filter by visual style.'),
    hasAudio: z
      .boolean()
      .optional()
      .describe('Filter stories by whether audio is currently available.'),
    query: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
      .describe('Filter stories by title/slug search text.'),
  });

  const listMineInput = z
    .object({
      ...storyLibraryFilterSchema.shape,
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of stories to return (default 12).'),
      cursor: z
        .string()
        .optional()
        .describe('Opaque pagination cursor from a previous story_list response.'),
      sortBy: z
        .enum(STORY_LIBRARY_SORT_FIELDS)
        .optional()
        .describe('Sort field. Defaults to updatedAt.'),
      sortDirection: z
        .enum(STORY_LIBRARY_SORT_DIRECTIONS)
        .optional()
        .describe('Sort direction. Defaults to desc.'),
    })
    .optional();

  const storySelectInput = storyLibraryFilterSchema
    .extend({
      storyId: z.string().trim().min(1).optional().describe('Exact story ID to select.'),
      title: z.string().trim().min(1).max(255).optional().describe('Story title to resolve.'),
      maxCandidates: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Maximum candidate matches to return when ambiguous (default 5).'),
    })
    .refine((value) => Boolean(value.storyId || value.title || value.query), {
      message: 'Provide storyId, title, or query to select a story.',
    });

  const storyIdSchema = z.string().min(1).describe('Story ID belonging to the authenticated user.');
  const storyReadModeSchema = z
    .enum(STORY_READ_MODES)
    .optional()
    .describe('Read output mode: full chapter text, summary, or excerpt.');
  const storyReadMaxCharsSchema = z
    .number()
    .int()
    .min(200)
    .max(20000)
    .optional()
    .describe('Maximum number of characters to return in chapter text outputs.');

  const storyReadOverviewInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    storyId: storyIdSchema,
    includeChapterPreview: z
      .boolean()
      .optional()
      .describe('Include preview text for one chapter (defaults to true).'),
    previewChapterNumber: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('Chapter number to preview. Defaults to chapter 1.'),
    previewMode: storyReadModeSchema,
    previewMaxChars: storyReadMaxCharsSchema,
  });

  const storyReadChapterInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    storyId: storyIdSchema,
    chapterNumber: z.number().int().min(1).describe('Chapter number to read.'),
    mode: storyReadModeSchema,
    maxOutputChars: storyReadMaxCharsSchema,
  });

  const storyReadNextChapterInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    storyId: storyIdSchema,
    currentChapterNumber: z
      .number()
      .int()
      .min(1)
      .describe('Current chapter number in reading context.'),
    direction: z
      .enum(STORY_READ_NAVIGATION_DIRECTIONS)
      .optional()
      .describe('Navigation direction. Defaults to next chapter.'),
    mode: storyReadModeSchema,
    maxOutputChars: storyReadMaxCharsSchema,
  });

  const generationFeatureSchema = z
    .object({
      ebook: z.boolean().optional().describe('Generate the digital book output. Defaults to true.'),
      printed: z.boolean().optional().describe('Request print preparation. Defaults to false.'),
      audiobook: z
        .boolean()
        .optional()
        .describe('Request audiobook generation. Defaults to false.'),
    })
    .optional();

  const draftMetadataSchema = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    title: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
      .describe('Story title or provisional title.'),
    storyLanguage: z
      .string()
      .trim()
      .min(2)
      .max(5)
      .optional()
      .describe('Story language code, for example en-US or pt-PT.'),
    seedIdea: z
      .string()
      .trim()
      .min(1)
      .max(4000)
      .optional()
      .describe('Initial story idea used to seed synopsis/outline.'),
    targetAudience: z.nativeEnum(TargetAudience).optional(),
    novelStyle: z.nativeEnum(NovelStyle).optional(),
    graphicalStyle: z.nativeEnum(GraphicalStyle).optional(),
    literaryPersona: z.nativeEnum(LiteraryPersona).optional(),
    place: z.string().trim().max(1000).nullable().optional().describe('Story setting.'),
    outline: z
      .string()
      .trim()
      .max(8000)
      .nullable()
      .optional()
      .describe('Story outline or plot description.'),
    plotDescription: z
      .string()
      .trim()
      .max(8000)
      .nullable()
      .optional()
      .describe('Alias for outline.'),
    additionalRequests: z
      .string()
      .trim()
      .max(2000)
      .nullable()
      .optional()
      .describe('Extra user instructions to include in generation.'),
    imageGenerationInstructions: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .describe('Instructions for image generation style details.'),
    customAuthor: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .optional()
      .describe('Author name to print in the final story.'),
    dedicationMessage: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .describe('Optional dedication shown in story frontmatter.'),
    chapterCount: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe('Optional chapter count override.'),
  });

  const createDraftInput = draftMetadataSchema;

  const updateDraftInput = draftMetadataSchema.extend({
    storyId: storyIdSchema,
  });

  const storyCharacterInput = z
    .object({
      existingCharacterId: z
        .string()
        .min(1)
        .optional()
        .describe('Existing character ID to link to this story.'),
      name: z.string().trim().min(1).max(120).optional().describe('Name for a new character.'),
      role: z
        .enum(CHARACTER_ROLES)
        .optional()
        .describe('Optional role this character plays in this story.'),
      type: z.string().trim().max(50).optional().describe('Optional free-text character type.'),
      age: z.enum(CHARACTER_AGES).optional().describe('Optional character age bucket.'),
      traits: z.array(z.string().trim().min(1).max(40)).max(5).optional(),
      characteristics: z.string().trim().max(1000).optional(),
      physicalDescription: z.string().trim().max(1000).optional(),
    })
    .refine((value) => Boolean(value.existingCharacterId || value.name), {
      message: 'Provide either existingCharacterId or name for each character.',
    });

  const addCharactersInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    storyId: storyIdSchema,
    characters: z
      .array(storyCharacterInput)
      .min(1)
      .max(12)
      .describe('List of characters to link/create for this story.'),
  });

  const startGenerationInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    storyId: storyIdSchema,
    features: generationFeatureSchema,
    dedicationMessage: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional()
      .describe('Optional dedication override for generation.'),
    customAuthor: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .optional()
      .describe('Optional custom author override for generation.'),
    deliveryAddress: z
      .object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        stateRegion: z.string(),
        postalCode: z.string(),
        country: z.string(),
        phone: z.string().optional(),
      })
      .nullable()
      .optional(),
    dryRun: z
      .boolean()
      .optional()
      .describe('If true, only validate readiness and estimate credits.'),
    confirmStart: z
      .boolean()
      .optional()
      .describe('Must be true to deduct credits and enqueue generation.'),
  });

  server.registerTool(
    TOOL_NAMES.accountStoryList,
    {
      description:
        'Use this when the user asks about their stories, drafts, or library items. Requires authentication.',
      inputSchema: listMineInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof listMineInput>) =>
      executeTool(TOOL_NAMES.accountStoryList, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input?.locale);
        const copy = getStoryLibraryCopy(resolvedLocale);
        const includeTemporary = input?.includeTemporary ?? false;
        const statusFilters = resolveStoryStatusFilters(input?.status);
        const query = sanitizeOptionalText(input?.query);
        const limit = input?.limit ?? 12;
        const sortBy = input?.sortBy ?? 'updatedAt';
        const sortDirection = input?.sortDirection ?? 'desc';
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.accountStoryList),
        );
        const stories = await storyService.getStoriesByAuthor(author.authorId);
        const filteredStories = filterStoryLibrary(stories, {
          includeTemporary,
          statusFilters,
          storyLanguage: input?.storyLanguage,
          targetAudience: input?.targetAudience,
          graphicalStyle: input?.graphicalStyle,
          hasAudio: input?.hasAudio,
          query: typeof query === 'string' ? query : null,
        });
        const sortedStories = [...filteredStories].sort((a, b) =>
          compareStoriesForLibrary(a, b, sortBy, sortDirection),
        );
        const cursorData = input?.cursor
          ? decodeStoryListCursor(input.cursor, sortBy, sortDirection)
          : null;
        const offset = cursorData?.offset ?? 0;
        const pagedStories = sortedStories.slice(offset, offset + limit);
        const nextOffset = offset + pagedStories.length;
        const hasMore = nextOffset < sortedStories.length;
        const nextCursor = hasMore
          ? encodeStoryListCursor({
              offset: nextOffset,
              sortBy,
              sortDirection,
            })
          : null;

        const payload: Record<string, unknown> = {
          locale: resolvedLocale,
          authorId: author.authorId,
          total: sortedStories.length,
          returned: pagedStories.length,
          sort: {
            by: sortBy,
            direction: sortDirection,
          },
          appliedFilters: {
            includeTemporary: includeTemporary || Boolean(statusFilters?.includes('temporary')),
            status: statusFilters,
            storyLanguage: input?.storyLanguage ?? null,
            targetAudience: input?.targetAudience ?? null,
            graphicalStyle: input?.graphicalStyle ?? null,
            hasAudio: input?.hasAudio ?? null,
            query: typeof query === 'string' ? query : null,
          },
          pagination: {
            limit,
            cursor: input?.cursor ?? null,
            nextCursor,
            hasMore,
          },
          stories: pagedStories.map((story) => buildStoryLibraryEntry(story, resolvedLocale, copy)),
          guidance: copy.listGuidance,
        };

        return toStructuredToolResult(copy.listSummary, payload, {
          pagination: payload.pagination as Record<string, unknown>,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.accountStorySelect,
    {
      description:
        'Use this when the user names a story and you must resolve the exact story before read/listen/edit/share actions.',
      inputSchema: storySelectInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof storySelectInput>) =>
      executeTool(TOOL_NAMES.accountStorySelect, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryLibraryCopy(resolvedLocale);
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.accountStorySelect),
        );

        const statusFilters = resolveStoryStatusFilters(input.status);
        const stories = await storyService.getStoriesByAuthor(author.authorId);
        const filteredStories = filterStoryLibrary(stories, {
          includeTemporary: input.includeTemporary ?? false,
          statusFilters,
          storyLanguage: input.storyLanguage,
          targetAudience: input.targetAudience,
          graphicalStyle: input.graphicalStyle,
          hasAudio: input.hasAudio,
        });
        const maxCandidates = input.maxCandidates ?? 5;

        if (input.storyId) {
          const selected = filteredStories.find((story) => story.storyId === input.storyId);
          if (selected) {
            return toStructuredToolResult(copy.selectionResolved, {
              locale: resolvedLocale,
              selection: {
                status: 'selected',
                matchType: 'storyId',
              },
              story: buildStoryLibraryEntry(selected, resolvedLocale, copy),
              candidates: [],
              guidance: copy.listGuidance,
            });
          }
        }

        const selectionQuery = sanitizeOptionalText(input.title ?? input.query);
        if (!selectionQuery || typeof selectionQuery !== 'string') {
          return toStructuredToolResult(copy.selectionNotFound, {
            locale: resolvedLocale,
            selection: {
              status: 'not_found',
              query: input.title ?? input.query ?? input.storyId ?? null,
            },
            story: null,
            candidates: [],
            guidance: copy.disambiguationPrompt,
          });
        }

        const rankedMatches = filteredStories
          .map((story) => ({
            story,
            score: getStoryMatchScore(story, selectionQuery),
          }))
          .filter((entry) => entry.score !== null)
          .sort((left, right) => {
            const scoreDelta = (left.score ?? 99) - (right.score ?? 99);
            if (scoreDelta !== 0) return scoreDelta;
            return compareStoriesForLibrary(left.story, right.story, 'updatedAt', 'desc');
          });

        if (rankedMatches.length === 0) {
          const suggestions = [...filteredStories]
            .sort((a, b) => compareStoriesForLibrary(a, b, 'updatedAt', 'desc'))
            .slice(0, Math.min(maxCandidates, 3))
            .map((story) => buildStoryLibraryEntry(story, resolvedLocale, copy));

          return toStructuredToolResult(copy.selectionNotFound, {
            locale: resolvedLocale,
            selection: {
              status: 'not_found',
              query: selectionQuery,
            },
            story: null,
            candidates: suggestions,
            guidance: copy.disambiguationPrompt,
          });
        }

        const exactMatches = rankedMatches.filter((entry) => entry.score === 1);
        const selectedMatch =
          exactMatches.length === 1
            ? exactMatches[0]
            : rankedMatches.length === 1
              ? rankedMatches[0]
              : null;

        if (selectedMatch) {
          return toStructuredToolResult(copy.selectionResolved, {
            locale: resolvedLocale,
            selection: {
              status: 'selected',
              query: selectionQuery,
              matchType: selectedMatch.score === 1 ? 'exact_title' : 'fuzzy',
            },
            story: buildStoryLibraryEntry(selectedMatch.story, resolvedLocale, copy),
            candidates: [],
            guidance: copy.listGuidance,
          });
        }

        return toStructuredToolResult(copy.selectionAmbiguous, {
          locale: resolvedLocale,
          selection: {
            status: 'ambiguous',
            query: selectionQuery,
            candidateCount: rankedMatches.length,
          },
          story: null,
          candidates: rankedMatches
            .slice(0, maxCandidates)
            .map((entry) => buildStoryLibraryEntry(entry.story, resolvedLocale, copy)),
          guidance: copy.disambiguationPrompt,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyReadOverview,
    {
      description:
        'Use this to load story reading metadata and chapter table of contents before reading. Supports owner and public stories.',
      inputSchema: storyReadOverviewInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof storyReadOverviewInput>) =>
      executeTool(TOOL_NAMES.storyReadOverview, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryReadingCopy(resolvedLocale);
        const story = await storyService.getStoryById(input.storyId);
        if (!story) {
          throw new McpToolUserError('Story not found.');
        }

        const accessLevel = resolveStoryReadAccess(story, authContext, copy);
        const chapters = await chapterService.getStoryChapters(story.storyId);
        const chapterItems = chapters.map((chapter) => ({
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          hasAudio: Boolean(chapter.audioUri),
          readUrl: resolveAuthorStoryReadChapterUrl(
            resolvedLocale,
            story.storyId,
            chapter.chapterNumber,
          ),
          publicReadUrl:
            story.slug && story.isPublic
              ? resolvePublicStoryChapterUrl(resolvedLocale, story.slug, chapter.chapterNumber)
              : null,
        }));

        if (chapters.length === 0) {
          return toStructuredToolResult(copy.noChaptersAvailable, {
            locale: resolvedLocale,
            status: 'no_chapters',
            accessLevel,
            story: {
              id: story.storyId,
              title: story.title,
              status: story.status,
              language: story.storyLanguage,
              targetAudience: story.targetAudience,
              novelStyle: story.novelStyle,
              graphicalStyle: story.graphicalStyle,
              synopsis: story.synopsis,
              chapterCount: 0,
              hasAudio: Boolean(story.hasAudio),
              isPublic: story.isPublic,
              slug: story.slug,
            },
            chapters: {
              total: 0,
              items: [],
            },
            urls: buildStoryReadingUrls(story, resolvedLocale, null, accessLevel),
            guidance: copy.guidance,
          });
        }

        const includeChapterPreview = input.includeChapterPreview ?? true;
        const previewChapterNumber = input.previewChapterNumber ?? 1;
        const previewMode = input.previewMode ?? 'excerpt';
        const previewMaxChars = input.previewMaxChars ?? 1200;
        const previewChapter = includeChapterPreview
          ? (findChapterByNumber(chapters, previewChapterNumber) ?? chapters[0])
          : null;

        const preview = previewChapter
          ? (() => {
              const previewContent = resolveChapterOutput(
                previewChapter,
                previewMode,
                previewMaxChars,
              );
              const navigation = buildChapterNavigation(chapters, previewChapter.chapterNumber);
              return {
                chapterNumber: previewChapter.chapterNumber,
                title: previewChapter.title,
                mode: previewMode,
                text: previewContent.text,
                summary: previewContent.summary,
                wordCount: previewContent.wordCount,
                truncated: previewContent.truncated,
                navigation,
              };
            })()
          : null;

        return toStructuredToolResult(copy.overviewReady, {
          locale: resolvedLocale,
          status: 'ok',
          accessLevel,
          story: {
            id: story.storyId,
            title: story.title,
            status: story.status,
            language: story.storyLanguage,
            targetAudience: story.targetAudience,
            novelStyle: story.novelStyle,
            graphicalStyle: story.graphicalStyle,
            synopsis: story.synopsis,
            dedicationMessage: story.dedicationMessage,
            chapterCount: chapters.length,
            hasAudio: Boolean(story.hasAudio),
            isPublic: story.isPublic,
            slug: story.slug,
          },
          chapters: {
            total: chapters.length,
            items: chapterItems,
          },
          preview,
          urls: buildStoryReadingUrls(
            story,
            resolvedLocale,
            preview?.chapterNumber ?? null,
            accessLevel,
          ),
          guidance: copy.guidance,
          recommendedNextTools: [TOOL_NAMES.storyReadChapter, TOOL_NAMES.storyReadNextChapter],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyReadChapter,
    {
      description:
        'Use this to read a specific chapter with full, summary, or excerpt output mode. Supports owner and public stories.',
      inputSchema: storyReadChapterInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof storyReadChapterInput>) =>
      executeTool(TOOL_NAMES.storyReadChapter, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryReadingCopy(resolvedLocale);
        const story = await storyService.getStoryById(input.storyId);
        if (!story) {
          throw new McpToolUserError('Story not found.');
        }

        const accessLevel = resolveStoryReadAccess(story, authContext, copy);
        const chapters = await chapterService.getStoryChapters(story.storyId);
        if (chapters.length === 0) {
          return toStructuredToolResult(copy.noChaptersAvailable, {
            locale: resolvedLocale,
            status: 'no_chapters',
            accessLevel,
            storyId: story.storyId,
            guidance: copy.guidance,
          });
        }

        const chapter = findChapterByNumber(chapters, input.chapterNumber);
        if (!chapter) {
          return toStructuredToolResult(copy.chapterNotFound, {
            locale: resolvedLocale,
            status: 'chapter_not_found',
            accessLevel,
            storyId: story.storyId,
            requestedChapterNumber: input.chapterNumber,
            availableChapterNumbers: chapters.map((item) => item.chapterNumber),
            guidance: copy.guidance,
          });
        }

        const mode = input.mode ?? 'full';
        const maxOutputChars = input.maxOutputChars ?? (mode === 'summary' ? 900 : 8000);
        const chapterOutput = resolveChapterOutput(chapter, mode, maxOutputChars);
        const navigation = buildChapterNavigation(chapters, chapter.chapterNumber);

        return toStructuredToolResult(copy.chapterReady, {
          locale: resolvedLocale,
          status: 'ok',
          accessLevel,
          mode,
          story: {
            id: story.storyId,
            title: story.title,
            status: story.status,
            language: story.storyLanguage,
            chapterCount: chapters.length,
            hasAudio: Boolean(story.hasAudio),
            isPublic: story.isPublic,
            slug: story.slug,
          },
          chapter: {
            chapterNumber: chapter.chapterNumber,
            title: chapter.title,
            text: chapterOutput.text,
            summary: chapterOutput.summary,
            plainTextLength: chapterOutput.plainText.length,
            wordCount: chapterOutput.wordCount,
            truncated: chapterOutput.truncated,
            imageUri: chapter.imageUri,
            hasAudio: Boolean(chapter.audioUri),
            audioUri: chapter.audioUri,
          },
          navigation,
          urls: buildStoryReadingUrls(story, resolvedLocale, chapter.chapterNumber, accessLevel),
          guidance: copy.guidance,
          recommendedNextTool: TOOL_NAMES.storyReadNextChapter,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyReadNextChapter,
    {
      description:
        'Use this to continue reading from the current chapter pointer (next or previous chapter).',
      inputSchema: storyReadNextChapterInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof storyReadNextChapterInput>) =>
      executeTool(TOOL_NAMES.storyReadNextChapter, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryReadingCopy(resolvedLocale);
        const story = await storyService.getStoryById(input.storyId);
        if (!story) {
          throw new McpToolUserError('Story not found.');
        }

        const accessLevel = resolveStoryReadAccess(story, authContext, copy);
        const chapters = await chapterService.getStoryChapters(story.storyId);
        if (chapters.length === 0) {
          return toStructuredToolResult(copy.noChaptersAvailable, {
            locale: resolvedLocale,
            status: 'no_chapters',
            accessLevel,
            storyId: story.storyId,
            guidance: copy.guidance,
          });
        }

        const currentChapter = findChapterByNumber(chapters, input.currentChapterNumber);
        if (!currentChapter) {
          return toStructuredToolResult(copy.chapterNotFound, {
            locale: resolvedLocale,
            status: 'chapter_not_found',
            accessLevel,
            storyId: story.storyId,
            requestedChapterNumber: input.currentChapterNumber,
            availableChapterNumbers: chapters.map((item) => item.chapterNumber),
            guidance: copy.guidance,
          });
        }

        const direction = input.direction ?? 'next';
        const chapterNumbers = chapters.map((chapter) => chapter.chapterNumber);
        const currentIndex = chapterNumbers.indexOf(input.currentChapterNumber);
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const targetChapterNumber = chapterNumbers[targetIndex];

        if (targetChapterNumber === undefined) {
          return toStructuredToolResult(copy.chapterNotFound, {
            locale: resolvedLocale,
            status: 'boundary_reached',
            accessLevel,
            storyId: story.storyId,
            direction,
            currentChapterNumber: input.currentChapterNumber,
            guidance:
              direction === 'next'
                ? 'You are already at the last chapter.'
                : 'You are already at the first chapter.',
          });
        }

        const targetChapter = findChapterByNumber(chapters, targetChapterNumber);
        if (!targetChapter) {
          return toStructuredToolResult(copy.chapterNotFound, {
            locale: resolvedLocale,
            status: 'chapter_not_found',
            accessLevel,
            storyId: story.storyId,
            requestedChapterNumber: targetChapterNumber,
            availableChapterNumbers: chapterNumbers,
            guidance: copy.guidance,
          });
        }

        const mode = input.mode ?? 'full';
        const maxOutputChars = input.maxOutputChars ?? (mode === 'summary' ? 900 : 8000);
        const chapterOutput = resolveChapterOutput(targetChapter, mode, maxOutputChars);
        const navigation = buildChapterNavigation(chapters, targetChapter.chapterNumber);

        return toStructuredToolResult(copy.chapterReady, {
          locale: resolvedLocale,
          status: 'ok',
          accessLevel,
          direction,
          mode,
          story: {
            id: story.storyId,
            title: story.title,
            status: story.status,
            language: story.storyLanguage,
            chapterCount: chapters.length,
            hasAudio: Boolean(story.hasAudio),
            isPublic: story.isPublic,
            slug: story.slug,
          },
          chapter: {
            chapterNumber: targetChapter.chapterNumber,
            title: targetChapter.title,
            text: chapterOutput.text,
            summary: chapterOutput.summary,
            plainTextLength: chapterOutput.plainText.length,
            wordCount: chapterOutput.wordCount,
            truncated: chapterOutput.truncated,
            imageUri: targetChapter.imageUri,
            hasAudio: Boolean(targetChapter.audioUri),
            audioUri: targetChapter.audioUri,
          },
          navigation,
          urls: buildStoryReadingUrls(
            story,
            resolvedLocale,
            targetChapter.chapterNumber,
            accessLevel,
          ),
          guidance: copy.guidance,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyCreateDraft,
    {
      description:
        'Use this to start a Mythoria story draft from user intent. Requires authentication.',
      inputSchema: createDraftInput,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof createDraftInput>) =>
      executeTool(TOOL_NAMES.storyCreateDraft, authContext, input, async () => {
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyCreateDraft),
        );
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryCreationCopy(resolvedLocale);

        const title = sanitizeOptionalText(input.title) ?? DEFAULT_STORY_TITLE;
        const normalizedLanguage = normalizeStoryLanguage(input.storyLanguage, resolvedLocale);
        const outline = sanitizeOptionalText(input.outline ?? input.plotDescription);
        const seedIdea = sanitizeOptionalText(input.seedIdea);

        const createdStory = await storyService.createStory({
          title,
          authorId: author.authorId,
          plotDescription: outline ?? seedIdea ?? undefined,
          synopsis: seedIdea ?? undefined,
          storyLanguage: normalizedLanguage,
          customAuthor: sanitizeOptionalText(input.customAuthor) ?? undefined,
          dedicationMessage: sanitizeOptionalText(input.dedicationMessage) ?? undefined,
          status: 'draft',
        });

        const chapterCount =
          input.chapterCount ?? getChapterCountForAudience(input.targetAudience ?? null);

        const draftPatch: Parameters<typeof storyService.updateStory>[1] = {
          chapterCount,
          ...(input.targetAudience ? { targetAudience: input.targetAudience } : {}),
          ...(input.novelStyle ? { novelStyle: input.novelStyle } : {}),
          ...(input.graphicalStyle ? { graphicalStyle: input.graphicalStyle } : {}),
          ...(input.literaryPersona ? { literaryPersona: input.literaryPersona } : {}),
          ...(outline !== undefined ? { plotDescription: outline } : {}),
          ...(sanitizeOptionalText(input.place) !== undefined
            ? { place: sanitizeOptionalText(input.place) }
            : {}),
          ...(sanitizeOptionalText(input.additionalRequests) !== undefined
            ? { additionalRequests: sanitizeOptionalText(input.additionalRequests) }
            : {}),
          ...(sanitizeOptionalText(input.imageGenerationInstructions) !== undefined
            ? {
                imageGenerationInstructions: sanitizeOptionalText(
                  input.imageGenerationInstructions,
                ),
              }
            : {}),
        };

        const finalStory =
          Object.keys(draftPatch).length > 0
            ? await storyService.updateStory(createdStory.storyId, draftPatch)
            : createdStory;

        const draftState = buildStoryDraftState(finalStory, resolvedLocale);

        return toStructuredToolResult(
          copy.draftCreated,
          {
            locale: resolvedLocale,
            story: draftState,
            guidance: draftState.readyToGenerate
              ? 'Draft is ready. Confirm and call mythoria.story.start_generation.'
              : copy.missingFields,
          },
          {
            story: finalStory,
            creationFlow: {
              nextRecommendedTool: draftState.readyToGenerate
                ? TOOL_NAMES.storyStartGeneration
                : TOOL_NAMES.storyUpdateDraft,
            },
          },
        );
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyUpdateDraft,
    {
      description:
        'Use this to update a story draft with required fields and optional creative details.',
      inputSchema: updateDraftInput,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof updateDraftInput>) =>
      executeTool(TOOL_NAMES.storyUpdateDraft, authContext, input, async () => {
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyUpdateDraft),
        );
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryCreationCopy(resolvedLocale);

        const story = ensureStoryOwnership(
          await storyService.getStoryById(input.storyId),
          author.authorId,
        );

        const outline = sanitizeOptionalText(input.outline ?? input.plotDescription);
        const patch: Parameters<typeof storyService.updateStory>[1] = {
          ...(sanitizeOptionalText(input.title) !== undefined
            ? { title: sanitizeOptionalText(input.title) ?? DEFAULT_STORY_TITLE }
            : {}),
          ...(input.storyLanguage !== undefined
            ? { storyLanguage: normalizeStoryLanguage(input.storyLanguage, resolvedLocale) }
            : {}),
          ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience } : {}),
          ...(input.novelStyle !== undefined ? { novelStyle: input.novelStyle } : {}),
          ...(input.graphicalStyle !== undefined ? { graphicalStyle: input.graphicalStyle } : {}),
          ...(input.literaryPersona !== undefined
            ? { literaryPersona: input.literaryPersona }
            : {}),
          ...(outline !== undefined ? { plotDescription: outline } : {}),
          ...(sanitizeOptionalText(input.place) !== undefined
            ? { place: sanitizeOptionalText(input.place) }
            : {}),
          ...(sanitizeOptionalText(input.additionalRequests) !== undefined
            ? { additionalRequests: sanitizeOptionalText(input.additionalRequests) }
            : {}),
          ...(sanitizeOptionalText(input.imageGenerationInstructions) !== undefined
            ? {
                imageGenerationInstructions: sanitizeOptionalText(
                  input.imageGenerationInstructions,
                ),
              }
            : {}),
          ...(sanitizeOptionalText(input.customAuthor) !== undefined
            ? { customAuthor: sanitizeOptionalText(input.customAuthor) }
            : {}),
          ...(sanitizeOptionalText(input.dedicationMessage) !== undefined
            ? { dedicationMessage: sanitizeOptionalText(input.dedicationMessage) }
            : {}),
          ...(input.chapterCount !== undefined ? { chapterCount: input.chapterCount } : {}),
        };

        if (input.targetAudience !== undefined && input.chapterCount === undefined) {
          patch.chapterCount = getChapterCountForAudience(input.targetAudience);
        }

        if (Object.keys(patch).length === 0) {
          throw new McpToolUserError('No draft fields were provided to update.');
        }

        const updatedStory = await storyService.updateStory(story.storyId, patch);
        const draftState = buildStoryDraftState(updatedStory, resolvedLocale);

        return toStructuredToolResult(
          copy.draftUpdated,
          {
            locale: resolvedLocale,
            story: draftState,
            guidance: draftState.readyToGenerate
              ? 'Draft is ready. Ask for confirmation and call mythoria.story.start_generation.'
              : copy.missingFields,
          },
          {
            story: updatedStory,
            previousStatus: story.status,
          },
        );
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyAddCharacters,
    {
      description:
        'Use this to add existing or new characters to a story draft. Requires authentication.',
      inputSchema: addCharactersInput,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof addCharactersInput>) =>
      executeTool(TOOL_NAMES.storyAddCharacters, authContext, input, async () => {
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyAddCharacters),
        );
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryCreationCopy(resolvedLocale);

        const story = ensureStoryOwnership(
          await storyService.getStoryById(input.storyId),
          author.authorId,
        );

        const existingRelations = await storyCharacterService.getCharactersByStory(story.storyId);
        const linkedCharacterIds = new Set(
          existingRelations.map((entry) => entry.character.characterId),
        );

        const added: Array<{
          characterId: string;
          name: string;
          source: 'existing' | 'created';
          role: string | null;
        }> = [];
        const skipped: Array<{
          index: number;
          reason: string;
          existingCharacterId?: string;
          name?: string;
        }> = [];

        for (const [index, item] of input.characters.entries()) {
          let character: Awaited<ReturnType<typeof characterService.getCharacterById>> | null =
            null;
          let source: 'existing' | 'created' = 'existing';

          if (item.existingCharacterId) {
            const existingCharacter = await characterService.getCharacterById(
              item.existingCharacterId,
            );
            if (!existingCharacter) {
              skipped.push({
                index,
                reason: 'Character not found.',
                existingCharacterId: item.existingCharacterId,
              });
              continue;
            }

            if (existingCharacter.authorId && existingCharacter.authorId !== author.authorId) {
              skipped.push({
                index,
                reason: 'Character does not belong to the current user.',
                existingCharacterId: item.existingCharacterId,
              });
              continue;
            }

            character = existingCharacter;
            source = 'existing';
          } else if (item.name) {
            const createdCharacter = await characterService.createCharacter({
              name: item.name,
              authorId: author.authorId,
              type: sanitizeOptionalText(item.type) ?? undefined,
              role: item.role ?? null,
              age: item.age ?? null,
              traits: item.traits ?? [],
              characteristics: sanitizeOptionalText(item.characteristics) ?? undefined,
              physicalDescription: sanitizeOptionalText(item.physicalDescription) ?? undefined,
            });
            character = createdCharacter;
            source = 'created';
          }

          if (!character) {
            skipped.push({
              index,
              reason: 'Character payload is invalid.',
              name: item.name,
            });
            continue;
          }

          if (linkedCharacterIds.has(character.characterId)) {
            skipped.push({
              index,
              reason: 'Character is already linked to this story.',
              existingCharacterId: character.characterId,
              name: character.name,
            });
            continue;
          }

          try {
            await storyCharacterService.addCharacterToStory(
              story.storyId,
              character.characterId,
              item.role ?? null,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            if (message.toLowerCase().includes('duplicate')) {
              skipped.push({
                index,
                reason: 'Character is already linked to this story.',
                existingCharacterId: character.characterId,
                name: character.name,
              });
              continue;
            }
            throw error;
          }

          linkedCharacterIds.add(character.characterId);
          added.push({
            characterId: character.characterId,
            name: character.name,
            source,
            role: item.role ?? null,
          });
        }

        if (story.status === 'temporary' && added.length > 0) {
          await storyService.updateStory(story.storyId, { status: 'draft' });
        }

        const refreshedStory = ensureStoryOwnership(
          await storyService.getStoryById(story.storyId),
          author.authorId,
        );
        const draftState = buildStoryDraftState(refreshedStory, resolvedLocale);

        return toStructuredToolResult(
          copy.charactersUpdated,
          {
            locale: resolvedLocale,
            story: draftState,
            added,
            skipped,
            guidance: draftState.readyToGenerate
              ? 'Characters were updated. Confirm and call mythoria.story.start_generation when ready.'
              : copy.missingFields,
          },
          {
            story: refreshedStory,
          },
        );
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyStartGeneration,
    {
      description:
        'Use this to validate readiness, estimate credits, and start story generation. Requires authentication.',
      inputSchema: startGenerationInput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof startGenerationInput>) =>
      executeTool(TOOL_NAMES.storyStartGeneration, authContext, input, async () => {
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyStartGeneration),
        );
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryCreationCopy(resolvedLocale);

        const story = ensureStoryOwnership(
          await storyService.getStoryById(input.storyId),
          author.authorId,
        );

        if (story.status === 'writing') {
          return toStructuredToolResult('Story generation is already running.', {
            locale: resolvedLocale,
            status: 'already_writing',
            story: buildStoryDraftState(story, resolvedLocale),
            nextActions: ['Wait for completion and then read or listen to the story.'],
          });
        }

        if (story.status === 'published') {
          return toStructuredToolResult('Story is already published.', {
            locale: resolvedLocale,
            status: 'already_published',
            story: buildStoryDraftState(story, resolvedLocale),
            nextActions: ['Use read/listen tools or export/print tools.'],
          });
        }

        const features = normalizeGenerationFeatures(input.features);
        if (!hasAnyGenerationFeature(features)) {
          throw new McpToolUserError(
            'At least one generation feature must be enabled (ebook, printed, or audiobook).',
          );
        }

        const draftState = buildStoryDraftState(story, resolvedLocale);
        const pricing = await pricingService.calculateCreditsForFeatures(features);
        const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
        const hasEnoughCredits = currentBalance >= pricing.total;
        const canStart = draftState.readyToGenerate && hasEnoughCredits;
        const dryRun = input.dryRun ?? false;
        const confirmStart = input.confirmStart ?? false;

        const previewPayload = {
          locale: resolvedLocale,
          status: draftState.readyToGenerate
            ? hasEnoughCredits
              ? confirmStart
                ? 'ready'
                : 'confirmation_required'
              : 'insufficient_credits'
            : 'missing_required_fields',
          canStart,
          story: draftState,
          features,
          creditCheck: {
            required: pricing.total,
            available: currentBalance,
            shortfall: Math.max(0, pricing.total - currentBalance),
            breakdown: pricing.breakdown.map((item) => ({
              serviceCode: item.serviceCode,
              credits: item.credits,
              label: getCreditServiceLabel(item.serviceCode),
            })),
          },
          guidance: !draftState.readyToGenerate
            ? copy.missingFields
            : !hasEnoughCredits
              ? copy.insufficientCredits
              : !confirmStart
                ? copy.confirmationRequired
                : 'Ready to start.',
        };

        if (!draftState.readyToGenerate || !hasEnoughCredits || dryRun || !confirmStart) {
          return toStructuredToolResult(
            !draftState.readyToGenerate
              ? copy.missingFields
              : !hasEnoughCredits
                ? copy.insufficientCredits
                : !confirmStart
                  ? copy.confirmationRequired
                  : 'Generation readiness check completed.',
            previewPayload,
            {
              story,
            },
          );
        }

        const creditTransactions = [];
        for (const item of pricing.breakdown) {
          const eventType = getCreditEventType(item.serviceCode);
          const ledgerEntry = await creditService.deductCredits(
            author.authorId,
            item.credits,
            eventType,
            story.storyId,
          );
          creditTransactions.push({
            id: ledgerEntry.id,
            amount: item.credits,
            serviceCode: item.serviceCode,
            label: getCreditServiceLabel(item.serviceCode),
          });
        }

        const generationUpdates: Parameters<typeof storyService.updateStory>[1] = {
          status: 'writing',
          features,
          ...(input.deliveryAddress !== undefined
            ? { deliveryAddress: input.deliveryAddress ?? undefined }
            : {}),
          ...(sanitizeOptionalText(input.customAuthor) !== undefined
            ? { customAuthor: sanitizeOptionalText(input.customAuthor) ?? undefined }
            : {}),
          ...(sanitizeOptionalText(input.dedicationMessage) !== undefined
            ? { dedicationMessage: sanitizeOptionalText(input.dedicationMessage) ?? undefined }
            : {}),
        };

        await storyService.updateStory(story.storyId, generationUpdates);

        const runId = crypto.randomUUID();
        try {
          await publishStoryRequest({
            storyId: story.storyId,
            runId,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to publish story request from MCP tool:', error);
          throw new McpToolUserError('Failed to queue story generation workflow.');
        }

        const refreshedStory = ensureStoryOwnership(
          await storyService.getStoryById(story.storyId),
          author.authorId,
        );
        const job = createTrackedJobDescriptor('story_generation', story.storyId, { runId });

        return toStructuredToolResult(
          copy.queued,
          {
            locale: resolvedLocale,
            status: 'queued',
            runId,
            job,
            story: buildStoryDraftState(refreshedStory, resolvedLocale),
            features,
            creditUsage: {
              deducted: pricing.total,
              transactions: creditTransactions,
              previousBalance: currentBalance,
              newBalance: Math.max(0, currentBalance - pricing.total),
            },
            generationExpectations: {
              expectedWaitSeconds: 300,
              nextActions: [
                'Use mythoria.jobs.status with the jobId for status updates.',
                'When complete, offer read/listen/export actions.',
              ],
            },
            recommendedNextTools: [TOOL_NAMES.jobsStatus],
          },
          {
            story: refreshedStory,
          },
        );
      }),
  );
}

function registerSharingTools(server: McpServer, authContext: McpAuthContext) {
  const shareStateInputSchema = z.object({
    storyId: z.string().trim().min(1).describe('Story ID to inspect sharing state for.'),
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    includeInactiveLinks: z
      .boolean()
      .optional()
      .describe('Include revoked/expired links in response. Defaults to false.'),
  });

  const shareCreateInputSchema = z.object({
    storyId: z.string().trim().min(1).describe('Story ID to share.'),
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    mode: z
      .enum(['public', 'private_view', 'private_edit'])
      .optional()
      .describe('Sharing mode. Defaults to private_view.'),
    expiresInDays: z
      .number()
      .int()
      .min(1)
      .max(365)
      .optional()
      .describe('Expiration in days for private links. Defaults to 30 days.'),
    confirmPublicExposure: z
      .boolean()
      .optional()
      .describe('Must be true before enabling public sharing.'),
  });

  const shareRevokeInputSchema = z
    .object({
      storyId: z.string().trim().min(1).describe('Story ID to revoke sharing for.'),
      locale: z
        .string()
        .optional()
        .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
      linkId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Optional specific share link ID to revoke.'),
      revokeAll: z
        .boolean()
        .optional()
        .describe('Set true to revoke all share links for the story.'),
      disablePublic: z
        .boolean()
        .optional()
        .describe('Also remove public visibility by setting isPublic=false.'),
      confirmRevoke: z
        .boolean()
        .optional()
        .describe('Must be true before revoking links or disabling public visibility.'),
    })
    .refine((value) => Boolean(value.revokeAll || value.linkId || value.disablePublic), {
      message: 'Provide linkId, revokeAll=true, or disablePublic=true.',
    });

  server.registerTool(
    TOOL_NAMES.storyShareState,
    {
      description:
        'Use this when users ask whether a story is public, which private links are active, or what sharing mode is currently enabled.',
      inputSchema: shareStateInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof shareStateInputSchema>) =>
      executeTool(TOOL_NAMES.storyShareState, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStorySharingCopy(resolvedLocale);
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyShareState),
        );
        const includeInactiveLinks = input.includeInactiveLinks ?? false;

        const shareState = await storyService.getShareState(input.storyId, author.authorId, {
          includeRevoked: includeInactiveLinks,
          includeExpired: includeInactiveLinks,
        });
        if (!shareState) {
          throw new McpToolUserError('Story not found or access denied.');
        }

        const now = Date.now();
        const links = shareState.links.map((link) => ({
          id: link.id,
          accessLevel: link.accessLevel,
          url: resolvePrivateShareUrl(link.id, link.accessLevel),
          revoked: link.revoked,
          expiresAt: link.expiresAt,
          isExpired: new Date(link.expiresAt).getTime() <= now,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt,
        }));
        const activeLinks = links.filter((link) => !link.revoked && !link.isExpired);
        const publicUrl =
          shareState.story.isPublic && shareState.story.slug
            ? resolveStoryWebUrl(resolvedLocale, shareState.story.slug)
            : null;

        return toStructuredToolResult(copy.stateReady, {
          locale: resolvedLocale,
          story: {
            id: shareState.story.storyId,
            title: shareState.story.title,
            slug: shareState.story.slug,
            isPublic: shareState.story.isPublic,
            publicUrl,
            updatedAt: shareState.story.updatedAt,
          },
          sharing: {
            activePrivateLinkCount: activeLinks.length,
            totalPrivateLinkCount: links.length,
            links,
          },
          guidance:
            'Use create_link for new public/private links and revoke_link for link invalidation or disabling public visibility.',
          recommendedNextTools: [TOOL_NAMES.storyShareCreateLink, TOOL_NAMES.storyShareRevokeLink],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyShareCreateLink,
    {
      description:
        'Use this to enable public sharing or create private view/edit links for a story. Requires explicit confirmation for public exposure.',
      inputSchema: shareCreateInputSchema,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof shareCreateInputSchema>) =>
      executeTool(TOOL_NAMES.storyShareCreateLink, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStorySharingCopy(resolvedLocale);
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyShareCreateLink),
        );
        const mode = input.mode ?? 'private_view';

        if (mode === 'public') {
          const confirmPublicExposure = input.confirmPublicExposure ?? false;
          const currentState = await storyService.getShareState(input.storyId, author.authorId, {
            includeRevoked: false,
            includeExpired: false,
          });
          if (!currentState) {
            throw new McpToolUserError('Story not found or access denied.');
          }

          if (!confirmPublicExposure) {
            return toStructuredToolResult(copy.publicConfirmationRequired, {
              locale: resolvedLocale,
              status: 'confirmation_required',
              story: {
                id: currentState.story.storyId,
                title: currentState.story.title,
                isPublic: currentState.story.isPublic,
                currentPublicUrl:
                  currentState.story.isPublic && currentState.story.slug
                    ? resolveStoryWebUrl(resolvedLocale, currentState.story.slug)
                    : null,
              },
              sideEffects: {
                externalVisibility: true,
              },
              guidance: copy.publicConfirmationRequired,
            });
          }

          const updatedStory = await storyService.setPublicVisibility(
            input.storyId,
            author.authorId,
            true,
          );
          if (!updatedStory || !updatedStory.slug) {
            throw new McpToolUserError('Unable to enable public sharing for this story.');
          }

          return toStructuredToolResult(copy.linkCreated, {
            locale: resolvedLocale,
            status: 'public_enabled',
            story: {
              id: updatedStory.storyId,
              title: updatedStory.title,
              isPublic: updatedStory.isPublic,
              slug: updatedStory.slug,
              publicUrl: resolveStoryWebUrl(resolvedLocale, updatedStory.slug),
              updatedAt: updatedStory.updatedAt,
            },
            sharing: {
              mode: 'public',
              visibility: 'external',
            },
            recommendedNextTools: [TOOL_NAMES.storyShareState],
          });
        }

        const accessLevel = mode === 'private_edit' ? 'edit' : 'view';
        const expiresInDays = input.expiresInDays ?? 30;
        const link = await storyService.createShareLink(input.storyId, author.authorId, {
          accessLevel,
          expiresInDays,
        });
        if (!link) {
          throw new McpToolUserError('Story not found or access denied.');
        }

        return toStructuredToolResult(copy.linkCreated, {
          locale: resolvedLocale,
          status: 'private_link_created',
          storyId: link.storyId,
          sharing: {
            mode,
            accessLevel: link.accessLevel,
            linkId: link.id,
            url: resolvePrivateShareUrl(link.id, link.accessLevel),
            expiresAt: link.expiresAt,
          },
          recommendedNextTools: [TOOL_NAMES.storyShareState, TOOL_NAMES.storyShareRevokeLink],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyShareRevokeLink,
    {
      description:
        'Use this to revoke one link, revoke all links, or disable public visibility for a story. This is destructive and requires explicit confirmation.',
      inputSchema: shareRevokeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof shareRevokeInputSchema>) =>
      executeTool(TOOL_NAMES.storyShareRevokeLink, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStorySharingCopy(resolvedLocale);
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyShareRevokeLink),
        );
        const confirmRevoke = input.confirmRevoke ?? false;

        if (!confirmRevoke) {
          return toStructuredToolResult(copy.revokeConfirmationRequired, {
            locale: resolvedLocale,
            status: 'confirmation_required',
            requestedAction: {
              linkId: sanitizeOptionalText(input.linkId),
              revokeAll: input.revokeAll ?? false,
              disablePublic: input.disablePublic ?? false,
            },
            guidance: copy.revokeConfirmationRequired,
          });
        }

        const revokeResult = await storyService.revokeShareLinks(input.storyId, author.authorId, {
          linkId: sanitizeOptionalText(input.linkId) ?? undefined,
          revokeAll: input.revokeAll ?? false,
          disablePublic: input.disablePublic ?? false,
        });
        if (!revokeResult) {
          throw new McpToolUserError('Story not found or access denied.');
        }

        const state = await storyService.getShareState(input.storyId, author.authorId, {
          includeRevoked: false,
          includeExpired: false,
        });

        return toStructuredToolResult(
          revokeResult.revokedCount > 0 || revokeResult.visibilityUpdated
            ? copy.linkRevoked
            : 'No sharing entries were updated.',
          {
            locale: resolvedLocale,
            status:
              revokeResult.revokedCount > 0 || revokeResult.visibilityUpdated ? 'updated' : 'no_op',
            storyId: input.storyId,
            result: {
              revokedCount: revokeResult.revokedCount,
              publicVisibilityDisabled: revokeResult.visibilityUpdated,
            },
            remainingActivePrivateLinks: state?.links.length ?? 0,
            recommendedNextTools: [TOOL_NAMES.storyShareState],
          },
        );
      }),
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

  const creditEligibilityInput = z.object({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    action: z
      .enum(['ebook', 'audiobook', 'print', 'story_generation'])
      .describe('Action to evaluate for credit eligibility.'),
    storyFeatures: z
      .object({
        ebook: z.boolean().optional(),
        printed: z.boolean().optional(),
        audiobook: z.boolean().optional(),
      })
      .optional()
      .describe('Optional feature mix when action is story_generation.'),
  });

  server.registerTool(
    TOOL_NAMES.accountCreditUsage,
    {
      description:
        'Use this when the user asks about remaining credits or recent credit events. Requires authentication.',
      inputSchema: creditsUsageInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof creditsUsageInput>) =>
      executeTool(TOOL_NAMES.accountCreditUsage, authContext, input, async () => {
        const limit = input?.limit ?? 50;
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.accountCreditUsage),
        );
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
      }),
  );

  server.registerTool(
    TOOL_NAMES.creditsCheckEligibility,
    {
      description:
        'Use this to check if the authenticated user has enough credits for ebook generation, audiobook generation, print, or a combined story_generation request.',
      inputSchema: creditEligibilityInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof creditEligibilityInput>) =>
      executeTool(TOOL_NAMES.creditsCheckEligibility, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getCreditEligibilityCopy(resolvedLocale);
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.creditsCheckEligibility),
        );
        const action = input.action as CreditEligibilityAction;
        const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);

        let requiredCredits = 0;
        let breakdown: Array<{ serviceCode: string; credits: number; label: string }> = [];
        let evaluatedFeatures: StoryGenerationFeatures | null = null;

        if (action === 'story_generation') {
          const features = normalizeGenerationFeatures(input.storyFeatures);
          if (!hasAnyGenerationFeature(features)) {
            throw new McpToolUserError('Select at least one story generation feature.');
          }

          const pricing = await pricingService.calculateCreditsForFeatures(features);
          requiredCredits = pricing.total;
          breakdown = pricing.breakdown.map((item) => ({
            serviceCode: item.serviceCode,
            credits: item.credits,
            label: getCreditServiceLabel(item.serviceCode),
          }));
          evaluatedFeatures = features;
        } else {
          const serviceCode = resolveCreditActionServiceCode(action);
          const pricing = await pricingService.getPricingByServiceCode(serviceCode);
          if (!pricing) {
            throw new McpToolUserError(`Pricing is not configured for ${serviceCode}.`);
          }
          requiredCredits = pricing.credits;
          breakdown = [
            {
              serviceCode,
              credits: pricing.credits,
              label: getCreditServiceLabel(serviceCode),
            },
          ];
        }

        const eligible = currentBalance >= requiredCredits;
        const shortfall = Math.max(0, requiredCredits - currentBalance);
        const recommendedNextTools = eligible
          ? resolveCreditEligibilityNextTools(action)
          : [TOOL_NAMES.accountCreditUsage, TOOL_NAMES.accountPaymentHistory];

        return toStructuredToolResult(eligible ? copy.eligible : copy.insufficientCredits, {
          locale: resolvedLocale,
          action,
          eligibility: {
            eligible,
            requiredCredits,
            availableCredits: currentBalance,
            shortfall,
          },
          pricing: {
            breakdown,
            ...(evaluatedFeatures ? { storyFeatures: evaluatedFeatures } : {}),
          },
          policy: {
            inChatDigitalPurchaseAllowed: false,
            guidance: copy.policyGuidance,
          },
          recommendedNextTools,
          guidance: eligible
            ? 'Proceed with the requested action after explicit user confirmation.'
            : copy.policyGuidance,
        });
      }),
  );
}

function createJobPayload(
  type: TrackedJobType,
  storyId: string,
  options?: Record<string, unknown>,
) {
  const descriptor = createTrackedJobDescriptor(type, storyId);
  return {
    ...descriptor,
    state: 'queued' as const,
    options,
    guidance: `Return jobId and offer mythoria.jobs.status for follow-up tracking.`,
  };
}

function registerFulfillmentTools(server: McpServer, authContext: McpAuthContext) {
  const storyIdSchema = z
    .string()
    .min(1)
    .describe('The target story ID belonging to the authenticated author.');

  const storyIdentifierInputSchema = z
    .object({
      storyId: z
        .string()
        .min(1)
        .optional()
        .describe('Story ID (recommended for authenticated users).'),
      slug: z
        .string()
        .min(1)
        .optional()
        .describe('Public story slug (supports anonymous access for public stories).'),
    })
    .refine((value) => Boolean(value.storyId || value.slug), {
      message: 'Provide storyId or slug.',
    });

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
    includeBackgroundMusic: z
      .boolean()
      .optional()
      .describe('Whether background music should be included. Defaults to true.'),
    language: z
      .string()
      .optional()
      .describe('Desired narration language/locale. Defaults to the story language.'),
    dryRun: z
      .boolean()
      .optional()
      .describe('If true, only validate narration readiness and credit requirements.'),
    confirmStart: z
      .boolean()
      .optional()
      .describe('Must be true to deduct credits and enqueue narration generation.'),
    forceRegenerate: z
      .boolean()
      .optional()
      .describe('Allow re-generation even when audio already exists.'),
  });

  const audioStatusInputSchema = storyIdentifierInputSchema.extend({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    includeChapterDetails: z
      .boolean()
      .optional()
      .describe('Include per-chapter audio details (defaults to true).'),
  });

  const audioChapterInputSchema = storyIdentifierInputSchema.extend({
    locale: z
      .string()
      .optional()
      .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    chapterNumber: z.number().int().min(1).describe('1-based chapter number to play.'),
  });

  const voiceCatalogInputSchema = z
    .object({
      locale: z
        .string()
        .optional()
        .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
    })
    .optional();

  const jobStatusInputSchema = z
    .object({
      locale: z
        .string()
        .optional()
        .describe('Desired locale (for example en-US, pt-PT, es-ES, fr-FR, de-DE).'),
      jobId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Opaque Mythoria job ID returned by async tools.'),
      jobType: z
        .enum(TRACKED_JOB_TYPES)
        .optional()
        .describe('Job type when no jobId is available.'),
      storyId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Story ID when querying by type/story pair.'),
      runId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Optional run ID from generation responses.'),
    })
    .refine((value) => Boolean(value.jobId || (value.jobType && value.storyId)), {
      message: 'Provide jobId or both jobType and storyId.',
    });

  server.registerTool(
    TOOL_NAMES.jobsStatus,
    {
      description:
        'Use this to get normalized status for long-running Mythoria jobs (story generation, audiobook, export, print).',
      inputSchema: jobStatusInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof jobStatusInputSchema>) =>
      executeTool(TOOL_NAMES.jobsStatus, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getJobStatusCopy(resolvedLocale);
        const author = requireAuthor(authContext, resolveToolRequiredScopes(TOOL_NAMES.jobsStatus));

        let descriptor: TrackedJobDescriptor;
        if (input.jobId) {
          try {
            descriptor = parseTrackedJobId(input.jobId);
          } catch {
            throw new McpToolUserError(copy.invalidJobId);
          }
        } else {
          const fallbackStoryId = sanitizeOptionalText(input.storyId);
          if (!input.jobType || !fallbackStoryId) {
            throw new McpToolUserError('Provide jobId or both jobType and storyId.');
          }
          descriptor = createTrackedJobDescriptor(input.jobType, fallbackStoryId, {
            runId: sanitizeOptionalText(input.runId) ?? null,
          });
        }

        const story = ensureStoryOwnership(
          await storyService.getStoryById(descriptor.storyId),
          author.authorId,
        );

        let state: TrackedJobState = 'queued';
        let progress = 0;
        let failureCode: string | null = null;
        let details: Record<string, unknown> = {};
        let lastUpdatedAt: Date | string | null = story.updatedAt ?? null;

        if (descriptor.type === 'story_generation') {
          const normalized = resolveStoryGenerationJobState(story);
          state = normalized.state;
          progress = normalized.progress;
          failureCode = normalized.failureCode;
          details = {
            storyStatus: story.status,
            storyGenerationStatus: story.storyGenerationStatus ?? null,
            storyGenerationCompletedPercentage: story.storyGenerationCompletedPercentage ?? 0,
          };
        } else if (descriptor.type === 'audiobook_generation') {
          const normalized = resolveAudiobookJobState(story);
          state = normalized.state;
          progress = normalized.progress;
          failureCode = normalized.failureCode;
          details = {
            audiobookStatus: story.audiobookStatus ?? null,
            hasAudio: Boolean(story.hasAudio),
            generationStatus: normalized.generationStatus,
          };
        } else if (descriptor.type === 'export') {
          const normalized = resolveExportJobState(story);
          state = normalized.state;
          progress = normalized.progress;
          failureCode = normalized.failureCode;
          details = {
            storyStatus: story.status,
            hasInteriorPdf: Boolean(story.interiorPdfUri),
            hasCoverPdf: Boolean(story.coverPdfUri),
          };
        } else {
          const latestPrintRequest = await printRequestService.getLatestByStoryAndAuthor(
            story.storyId,
            author.authorId,
          );
          const normalized = resolvePrintJobState(latestPrintRequest?.status ?? null);
          state = normalized.state;
          progress = normalized.progress;
          failureCode = normalized.failureCode;
          lastUpdatedAt = latestPrintRequest?.updatedAt ?? story.updatedAt ?? null;
          details = {
            printRequest: latestPrintRequest
              ? {
                  id: latestPrintRequest.id,
                  status: latestPrintRequest.status,
                  requestedAt: latestPrintRequest.requestedAt,
                  updatedAt: latestPrintRequest.updatedAt,
                  printedAt: latestPrintRequest.printedAt,
                  pdfUrl: latestPrintRequest.pdfUrl || null,
                }
              : null,
          };
        }

        const etaSecondsRaw = resolveRemainingEtaSeconds(
          descriptor.requestedAt,
          descriptor.etaSeconds,
        );
        const etaSeconds =
          state === 'completed' || state === 'failed'
            ? 0
            : (etaSecondsRaw ?? descriptor.etaSeconds);
        const nextAction = resolveJobNextAction(descriptor.type, state);
        const recommendedNextTools =
          state === 'completed'
            ? descriptor.type === 'story_generation'
              ? [TOOL_NAMES.storyReadOverview, TOOL_NAMES.storyReadChapter]
              : descriptor.type === 'audiobook_generation'
                ? [TOOL_NAMES.storyAudioStatus, TOOL_NAMES.storyAudioChapter]
                : descriptor.type === 'export'
                  ? [TOOL_NAMES.storyExportRequest]
                  : [TOOL_NAMES.storyPrintRequest]
            : state === 'failed'
              ? descriptor.type === 'story_generation'
                ? [TOOL_NAMES.storyStartGeneration]
                : descriptor.type === 'audiobook_generation'
                  ? [TOOL_NAMES.storyNarrationRequest]
                  : descriptor.type === 'export'
                    ? [TOOL_NAMES.storyExportRequest]
                    : [TOOL_NAMES.storyPrintRequest]
              : [TOOL_NAMES.jobsStatus];

        return toStructuredToolResult(copy.statusReady, {
          locale: resolvedLocale,
          job: {
            jobId: descriptor.jobId,
            type: descriptor.type,
            storyId: descriptor.storyId,
            runId: descriptor.runId,
            requestedAt: descriptor.requestedAt,
            state,
            progress,
            etaSeconds,
            lastUpdatedAt,
            failureCode,
            nextAction,
          },
          story: {
            id: story.storyId,
            title: story.title,
            status: story.status,
            storyLanguage: story.storyLanguage,
            isPublic: story.isPublic,
            hasAudio: Boolean(story.hasAudio),
          },
          details,
          guidance: copy.guidance,
          recommendedNextTools,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyVoiceCatalog,
    {
      description:
        'Use this to list available narration voices and defaults before requesting audiobook generation.',
      inputSchema: voiceCatalogInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof voiceCatalogInputSchema>) =>
      executeTool(TOOL_NAMES.storyVoiceCatalog, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input?.locale);
        const provider = getTTSProvider();
        const voices = getAvailableVoices(provider);
        const defaultVoice = getDefaultVoice(provider);

        return toStructuredToolResult('Voice catalog retrieved.', {
          locale: resolvedLocale,
          provider,
          defaultVoice,
          voices: voices.map((voice) => ({
            id: voice.value,
            labelKey: `Voices.${voice.labelKey}`,
            descriptionKey: `Voices.${voice.descriptionKey}`,
            isDefault: voice.value === defaultVoice,
          })),
          guidance: 'Ask the user to pick a voiceId and optional background music preference.',
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyAudioStatus,
    {
      description:
        'Use this to check audiobook availability and generation status before playback or narration requests.',
      inputSchema: audioStatusInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof audioStatusInputSchema>) =>
      executeTool(TOOL_NAMES.storyAudioStatus, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryListeningCopy(resolvedLocale);
        const story = await resolveStoryFromIdentifier({
          storyId: input.storyId,
          slug: input.slug,
        });
        const accessLevel = resolveStoryAudioAccess(story, authContext, copy);
        const chapters = await chapterService.getStoryChapters(story.storyId);
        const includeChapterDetails = input.includeChapterDetails ?? true;
        const audioEntries = buildAudiobookChapterEntries(story, chapters);
        const audioStatus = resolveStoryAudioGenerationStatus(story);
        const totalChapters =
          chapters.length > 0
            ? chapters.length
            : story.chapterCount && story.chapterCount > 0
              ? story.chapterCount
              : audioEntries.length;
        const availableAudioChapterNumbers = audioEntries.map((entry) => entry.chapterNumber);
        const hasAudio = availableAudioChapterNumbers.length > 0 || Boolean(story.hasAudio);
        const completedPercentage =
          audioStatus === 'completed'
            ? 100
            : audioStatus === 'generating' && totalChapters > 0
              ? Math.min(
                  95,
                  Math.floor((availableAudioChapterNumbers.length / totalChapters) * 100),
                )
              : 0;

        return toStructuredToolResult(copy.statusReady, {
          locale: resolvedLocale,
          accessLevel,
          status: hasAudio ? 'audio_available' : 'audio_unavailable',
          story: {
            id: story.storyId,
            title: story.title,
            storyStatus: story.status,
            storyLanguage: story.storyLanguage,
            hasAudio,
            isPublic: story.isPublic,
            slug: story.slug,
            chapterCount: totalChapters,
          },
          audiobook: {
            generationStatus: audioStatus,
            completedPercentage,
            availableAudioChapterCount: availableAudioChapterNumbers.length,
            availableAudioChapterNumbers,
            entries: includeChapterDetails
              ? audioEntries.map((entry) => ({
                  chapterNumber: entry.chapterNumber,
                  title: entry.title,
                  duration: entry.duration,
                  imageUri: entry.imageUri,
                  streamUrl: resolveAuthorStoryAudioApiUrl(story.storyId, entry.chapterNumber - 1),
                  publicStreamUrl:
                    story.slug && story.isPublic
                      ? resolveStoryAudioPreviewUrl(story.slug, entry.chapterNumber - 1)
                      : null,
                }))
              : [],
          },
          urls: {
            listenUrl:
              accessLevel === 'owner'
                ? resolveAuthorStoryListenUrl(resolvedLocale, story.storyId)
                : story.slug
                  ? resolvePublicStoryListenUrl(resolvedLocale, story.slug)
                  : null,
            readUrl:
              accessLevel === 'owner'
                ? resolveAuthorStoryReadUrl(resolvedLocale, story.storyId)
                : story.slug
                  ? resolveStoryWebUrl(resolvedLocale, story.slug)
                  : null,
          },
          guidance:
            hasAudio || audioStatus === 'generating'
              ? copy.guidance
              : 'Offer narration_request with confirmStart=true when user confirms credit spend.',
          recommendedNextTools: hasAudio
            ? [TOOL_NAMES.storyAudioChapter]
            : [TOOL_NAMES.storyVoiceCatalog, TOOL_NAMES.storyNarrationRequest],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyAudioChapter,
    {
      description:
        'Use this to retrieve a chapter-level audio stream URL (private or public, depending on access).',
      inputSchema: audioChapterInputSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof audioChapterInputSchema>) =>
      executeTool(TOOL_NAMES.storyAudioChapter, authContext, input, async () => {
        const resolvedLocale = resolveLocale(input.locale);
        const copy = getStoryListeningCopy(resolvedLocale);
        const story = await resolveStoryFromIdentifier({
          storyId: input.storyId,
          slug: input.slug,
        });
        const accessLevel = resolveStoryAudioAccess(story, authContext, copy);
        const chapters = await chapterService.getStoryChapters(story.storyId);
        const audioEntries = buildAudiobookChapterEntries(story, chapters);
        const targetEntry = audioEntries.find(
          (entry) => entry.chapterNumber === input.chapterNumber,
        );

        if (!targetEntry) {
          const status = resolveStoryAudioGenerationStatus(story);
          return toStructuredToolResult(copy.audioUnavailable, {
            locale: resolvedLocale,
            accessLevel,
            status: 'audio_not_available',
            storyId: story.storyId,
            chapterNumber: input.chapterNumber,
            generationStatus: status,
            availableAudioChapterNumbers: audioEntries.map((entry) => entry.chapterNumber),
            guidance:
              status === 'generating'
                ? copy.generationInProgress
                : 'Offer narration_request when user wants to generate audiobook audio.',
          });
        }

        const chapterIndex = targetEntry.chapterNumber - 1;

        return toStructuredToolResult(copy.chapterReady, {
          locale: resolvedLocale,
          accessLevel,
          status: 'ok',
          story: {
            id: story.storyId,
            title: story.title,
            hasAudio: true,
            storyLanguage: story.storyLanguage,
          },
          chapter: {
            chapterNumber: targetEntry.chapterNumber,
            chapterIndex,
            title: targetEntry.title,
            duration: targetEntry.duration,
            imageUri: targetEntry.imageUri,
            streamUrl: resolveAuthorStoryAudioApiUrl(story.storyId, chapterIndex),
            publicStreamUrl:
              story.slug && story.isPublic
                ? resolveStoryAudioPreviewUrl(story.slug, chapterIndex)
                : null,
          },
          guidance: copy.guidance,
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyExportRequest,
    {
      description:
        'Use this when the user wants a downloadable export (PDF/EPUB). Requires authentication and returns a queued job id.',
      inputSchema: downloadInputSchema,
      annotations: {
        readOnlyHint: false,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof downloadInputSchema>) =>
      executeTool(TOOL_NAMES.storyExportRequest, authContext, input, async () => {
        const { storyId, format } = input;
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyExportRequest),
        );
        ensureStoryOwnership(await storyService.getStoryById(storyId), author.authorId);

        const payload = createJobPayload('export', storyId, { format });
        return toStructuredToolResult('Story export request queued.', {
          ...payload,
          guidance:
            'Tell the user the export is queued and call mythoria.jobs.status with the returned jobId for updates.',
          recommendedNextTools: [TOOL_NAMES.jobsStatus],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyPrintRequest,
    {
      description:
        'Use this when the user asks for print-ready output. Requires authentication and returns a queued job id.',
      inputSchema: printInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof printInputSchema>) =>
      executeTool(TOOL_NAMES.storyPrintRequest, authContext, input, async () => {
        const { storyId, deliveryNotes } = input;
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyPrintRequest),
        );
        ensureStoryOwnership(await storyService.getStoryById(storyId), author.authorId);
        const payload = createJobPayload('print', storyId, { deliveryNotes });
        return toStructuredToolResult('Story print request queued.', {
          ...payload,
          guidance: 'Share the jobId and use mythoria.jobs.status to track print progress.',
          recommendedNextTools: [TOOL_NAMES.jobsStatus],
        });
      }),
  );

  server.registerTool(
    TOOL_NAMES.storyNarrationRequest,
    {
      description:
        'Use this to validate credits and queue audiobook generation. Requires authentication.',
      inputSchema: narrateInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async (input: z.infer<typeof narrateInputSchema>) =>
      executeTool(TOOL_NAMES.storyNarrationRequest, authContext, input, async () => {
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.storyNarrationRequest),
        );
        const story = ensureStoryOwnership(
          await storyService.getStoryById(input.storyId),
          author.authorId,
        );
        const resolvedLocale = resolveLocale(input.language);
        const copy = getStoryListeningCopy(resolvedLocale);

        if (story.status !== 'published') {
          throw new McpToolUserError('Story must be published before audiobook generation.');
        }

        if (story.audiobookStatus === 'generating') {
          return toStructuredToolResult(copy.generationInProgress, {
            locale: resolvedLocale,
            status: 'already_generating',
            storyId: story.storyId,
            audiobookStatus: story.audiobookStatus,
            guidance: 'Wait for completion and then call mythoria.story.audio_status.',
          });
        }

        const provider = getTTSProvider();
        const defaultVoice = getDefaultVoice(provider);
        const selectedVoice = input.voiceId?.trim() || defaultVoice;
        if (!isValidVoice(selectedVoice, provider)) {
          throw new McpToolUserError(
            `Invalid voiceId "${selectedVoice}" for provider "${provider}".`,
          );
        }

        const includeBackgroundMusic = input.includeBackgroundMusic ?? true;
        const dryRun = input.dryRun ?? false;
        const confirmStart = input.confirmStart ?? false;
        const forceRegenerate = input.forceRegenerate ?? false;

        if (
          (story.hasAudio || story.audiobookStatus === 'completed') &&
          !forceRegenerate &&
          !dryRun
        ) {
          return toStructuredToolResult(copy.chapterReady, {
            locale: resolvedLocale,
            status: 'already_available',
            storyId: story.storyId,
            hasAudio: true,
            guidance:
              'Audio already exists. Call mythoria.story.audio_status or set forceRegenerate=true to replace narration.',
          });
        }

        const audiobookPricing =
          await pricingService.getPricingByServiceCode('audioBookGeneration');
        if (!audiobookPricing) {
          throw new McpToolUserError('Audiobook pricing is not configured.');
        }

        const currentBalance = await creditService.getAuthorCreditBalance(author.authorId);
        const requiredCredits = audiobookPricing.credits;
        const hasEnoughCredits = currentBalance >= requiredCredits;

        const previewPayload = {
          locale: resolvedLocale,
          status: hasEnoughCredits
            ? confirmStart
              ? 'ready'
              : 'confirmation_required'
            : 'insufficient_credits',
          storyId: story.storyId,
          voice: {
            provider,
            selected: selectedVoice,
            includeBackgroundMusic,
          },
          creditCheck: {
            required: requiredCredits,
            available: currentBalance,
            shortfall: Math.max(0, requiredCredits - currentBalance),
            serviceCode: 'audioBookGeneration',
          },
          guidance: !hasEnoughCredits
            ? copy.insufficientCredits
            : !confirmStart
              ? copy.generationPreview
              : 'Ready to queue audiobook generation.',
        };

        if (!hasEnoughCredits || dryRun || !confirmStart) {
          return toStructuredToolResult(
            !hasEnoughCredits
              ? copy.insufficientCredits
              : !confirmStart
                ? copy.generationPreview
                : 'Narration readiness check completed.',
            previewPayload,
          );
        }

        await creditService.deductCredits(
          author.authorId,
          requiredCredits,
          'audioBookGeneration',
          story.storyId,
        );

        const runId = crypto.randomUUID();
        await storyService.updateStory(story.storyId, {
          audiobookStatus: 'generating',
        });

        try {
          await publishAudiobookRequest({
            storyId: story.storyId,
            runId,
            voice: selectedVoice,
            includeBackgroundMusic,
            language: input.language ?? story.storyLanguage,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error('Failed to publish audiobook request from MCP tool:', error);
          await storyService.updateStory(story.storyId, {
            audiobookStatus: null,
          });
          await creditService.addCredits(author.authorId, requiredCredits, 'refund');
          throw new McpToolUserError('Failed to queue audiobook generation workflow.');
        }

        const refreshedStory = ensureStoryOwnership(
          await storyService.getStoryById(story.storyId),
          author.authorId,
        );
        const newBalance = Math.max(0, currentBalance - requiredCredits);
        const job = createTrackedJobDescriptor('audiobook_generation', story.storyId, { runId });

        return toStructuredToolResult(copy.generationQueued, {
          locale: resolvedLocale,
          status: 'queued',
          runId,
          job,
          storyId: story.storyId,
          audiobookStatus: refreshedStory.audiobookStatus ?? 'generating',
          voice: {
            provider,
            selected: selectedVoice,
            includeBackgroundMusic,
          },
          creditUsage: {
            deducted: requiredCredits,
            previousBalance: currentBalance,
            newBalance,
          },
          generationExpectations: {
            expectedWaitSeconds: 240,
            nextActions: [
              'Call mythoria.jobs.status with the jobId to check progress.',
              'When ready, call mythoria.story.audio_chapter to retrieve chapter streams.',
            ],
          },
          guidance: copy.guidance,
          recommendedNextTools: [TOOL_NAMES.jobsStatus, TOOL_NAMES.storyAudioStatus],
        });
      }),
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
    TOOL_NAMES.accountPaymentHistory,
    {
      description:
        'Use this when the user asks about payments or credit purchases. Requires authentication.',
      inputSchema: transactionListInput,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (input: z.infer<typeof transactionListInput>) =>
      executeTool(TOOL_NAMES.accountPaymentHistory, authContext, input, async () => {
        const limit = input?.limit ?? 20;
        const author = requireAuthor(
          authContext,
          resolveToolRequiredScopes(TOOL_NAMES.accountPaymentHistory),
        );
        const transactions = await paymentService.getUserPaymentHistory(author.authorId, limit);

        const payload = {
          authorId: author.authorId,
          total: transactions.length,
          transactions: transactions.map((tx) => ({
            id: tx.id,
            providerOrderId: tx.providerOrderId ?? tx.revolutOrderId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            provider: tx.provider,
            creditBundle: tx.creditBundle,
            fiscalDocument: tx.fiscalDocument,
            invoiceId: tx.fiscalDocument?.fullDocNumber ?? tx.stripeInvoiceId,
            invoiceHostedUrl: tx.fiscalDocument?.pdfUrl ?? tx.stripeInvoiceHostedUrl,
            invoicePdf: tx.fiscalDocument?.pdfUrl ?? tx.stripeInvoicePdf,
            paymentMethodType: tx.paymentMethodType,
            createdAt: tx.createdAt,
            updatedAt: tx.updatedAt,
          })),
          guidance:
            'Use this to summarize purchase history and reconcile credits. Mention status (e.g., paid, pending, failed).',
        };

        return toJsonContent(payload);
      }),
  );

  server.registerTool(
    TOOL_NAMES.catalogCreditPackages,
    {
      description:
        'Use this when users ask which credit bundles are available. Does not require authentication.',
      annotations: {
        readOnlyHint: true,
      },
    },
    async () =>
      executeTool(TOOL_NAMES.catalogCreditPackages, authContext, undefined, async () => {
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
            'Recommend a package by credits/price. If the user is logged in, combine with account payment and credit usage tools to tailor suggestions.',
        };

        return toJsonContent(payload);
      }),
  );
}

export async function handleMcpHttpRequest(request: Request) {
  let authContext: McpAuthContext = {
    author: null,
    userId: null,
    scopes: [],
    tokenType: null,
    tokenPresented: false,
    authError: null,
  };

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

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { APP_BASE_URL } from './app-links';
import { MCP_PROTECTED_TOOL_SCOPE, MCP_PROTECTED_TOOL_SCOPES } from './auth';
import { isObjectRecord } from './tool-input';
import type { McpToolResult } from './tool-result';
import {
  MCP_APP_RESOURCE_MIME_TYPE,
  WIDGET_SURFACE_RESOURCE_URIS,
  WIDGET_TEMPLATES,
  type WidgetSurface,
} from './ui-widgets';

export const TOOL_NAMES = {
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

export const PROTECTED_TOOL_SCOPE = MCP_PROTECTED_TOOL_SCOPE;

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

export function resolveToolRequiredScopes(toolName: string): string[] {
  return resolveToolAuthPolicy(toolName)?.requiredScopes ?? [];
}

function resolveToolUiBinding(toolName: string): ToolUiBinding | null {
  return (TOOL_UI_BINDINGS as Record<string, ToolUiBinding | undefined>)[toolName] ?? null;
}

type RawRequestHandler = (request: unknown, extra: unknown) => Promise<unknown> | unknown;

export function registerUiResources(server: McpServer) {
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

export function installToolListMetadataHandler(server: McpServer) {
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

function resolveUrlOrigin(rawUrl: string, fallbackOrigin: string): string {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return fallbackOrigin;
  }
}

export function attachToolUiMetadata(toolName: string, result: McpToolResult): McpToolResult {
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

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PublicStoryValidationError, storyService } from '@/db/services';
import { APP_BASE_URL, resolveStoryWebUrl } from './app-links';
import { type McpAuthContext, requireAuthor } from './auth';
import { executeTool } from './tool-execution';
import { resolveLocale, sanitizeOptionalText } from './tool-input';
import { resolveToolRequiredScopes, TOOL_NAMES } from './tool-metadata';
import { McpToolUserError, toStructuredToolResult } from './tool-result';

function resolvePrivateShareUrl(token: string, accessLevel: 'view' | 'edit'): string {
  return accessLevel === 'edit' ? `${APP_BASE_URL}/s/${token}/edit` : `${APP_BASE_URL}/s/${token}`;
}

type StorySharingCopy = {
  stateReady: string;
  linkCreated: string;
  linkRevoked: string;
  publicConfirmationRequired: string;
  revokeConfirmationRequired: string;
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

function getStorySharingCopy(locale: string): StorySharingCopy {
  return STORY_SHARING_COPY[locale] ?? STORY_SHARING_COPY['en-US'];
}

export function registerSharingTools(server: McpServer, authContext: McpAuthContext) {
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

          let updatedStory;
          try {
            updatedStory = await storyService.setPublicVisibility(
              input.storyId,
              author.authorId,
              true,
            );
          } catch (error) {
            if (error instanceof PublicStoryValidationError) {
              throw new McpToolUserError(error.message);
            }
            throw error;
          }
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

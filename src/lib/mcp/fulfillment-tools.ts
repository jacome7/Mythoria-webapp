import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'crypto';
import { z } from 'zod';
import {
  chapterService,
  creditService,
  pricingService,
  printRequestService,
  storyService,
} from '@/db/services';
import {
  compensateProductGeneration,
  markProductGenerationQueued,
  startProductGeneration,
} from '@/lib/product-generation';
import { publishAudiobookRequest } from '@/lib/pubsub';
import { hasPremiumBookMarker } from '@/lib/premium-children-book/contract';
import { getCurrentPremiumAudiobook } from '@/lib/premium-children-book/audiobook';
import {
  getAvailableVoices,
  getDefaultVoice,
  getRecommendedVoice,
  getTTSProvider,
  isValidVoice,
} from '@/lib/voice-options';
import {
  APP_BASE_URL,
  resolveAuthorStoryListenUrl,
  resolveAuthorStoryReadUrl,
  resolveStoryAudioPreviewUrl,
  resolveStoryWebUrl,
} from './app-links';
import { type McpAuthContext, McpAuthError, requireAuthor } from './auth';
import {
  createTrackedJobDescriptor,
  parseTrackedJobId,
  TRACKED_JOB_TYPES,
  type TrackedJobDescriptor,
  type TrackedJobType,
} from './job-tracking';
import {
  ensureChapterBook,
  ensureStoryOwnership,
  type StoryChapterRecord,
  type StoryRecord,
} from './story-access';
import { executeTool } from './tool-execution';
import { resolveLocale, sanitizeOptionalText } from './tool-input';
import { PROTECTED_TOOL_SCOPE, resolveToolRequiredScopes, TOOL_NAMES } from './tool-metadata';
import { McpToolUserError, toStructuredToolResult } from './tool-result';

function resolveAuthorStoryAudioApiUrl(storyId: string, chapterIndex: number): string {
  return `${APP_BASE_URL}/api/stories/${storyId}/audio/${chapterIndex}`;
}

function resolvePublicStoryListenUrl(locale: string, slug: string): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}/listen`;
}

function premiumListeningDetails(
  story: StoryRecord,
  accessLevel: StoryAudioAccessLevel,
  locale: string,
) {
  if (story.status !== 'published')
    throw new McpToolUserError('A published premium edition is unavailable.');
  const audio = getCurrentPremiumAudiobook(story.storyId, story.features, story.audiobookUri);
  const listenUrl =
    accessLevel === 'owner'
      ? resolveAuthorStoryListenUrl(locale, story.storyId)
      : story.slug
        ? resolvePublicStoryListenUrl(locale, story.slug)
        : null;
  const entries =
    audio?.tracks.map(({ pageNumber, duration }, index) => ({
      pageNumber,
      duration,
      streamUrl:
        accessLevel === 'owner'
          ? `${resolveAuthorStoryAudioApiUrl(story.storyId, index)}?runId=${audio.runId}`
          : story.slug
            ? `${resolveStoryAudioPreviewUrl(story.slug, index)}?runId=${audio.runId}`
            : null,
    })) ?? [];
  return { listenUrl, entries, revision: audio?.revision };
}

type StoryAudioGenerationStatus = 'not_started' | 'generating' | 'completed' | 'failed';

type StoryAudioAccessLevel = 'owner' | 'public';

type AudiobookChapterEntry = {
  chapterNumber: number;
  title: string;
  audioUri: string;
  duration: number | null;
  imageUri: string | null;
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

type JobStatusCopy = {
  statusReady: string;
  invalidJobId: string;
  guidance: string;
};

type TrackedJobState = 'queued' | 'running' | 'completed' | 'failed';

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

function getStoryListeningCopy(locale: string): StoryListeningCopy {
  return STORY_LISTENING_COPY[locale] ?? STORY_LISTENING_COPY['en-US'];
}

function getJobStatusCopy(locale: string): JobStatusCopy {
  return JOB_STATUS_COPY[locale] ?? JOB_STATUS_COPY['en-US'];
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

export function registerFulfillmentTools(server: McpServer, authContext: McpAuthContext) {
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
    chapterNumber: z
      .number()
      .int()
      .min(1)
      .describe('1-based chapter number, or physical page number for an illustrated edition.'),
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
        if (hasPremiumBookMarker(story.features)) {
          const detail = premiumListeningDetails(story, accessLevel, resolvedLocale);
          const hasAudio = detail.entries.length > 0;
          return toStructuredToolResult(copy.statusReady, {
            locale: resolvedLocale,
            accessLevel,
            status: hasAudio ? 'audio_available' : 'audio_unavailable',
            story: {
              id: story.storyId,
              title: story.title,
              hasAudio,
              bookType: 'premium_children',
            },
            audiobook: {
              revision: detail.revision,
              generationStatus:
                story.audiobookStatus === 'generating' || story.audiobookStatus === 'failed'
                  ? story.audiobookStatus
                  : hasAudio
                    ? 'completed'
                    : 'not_started',
              pageNumbers: detail.entries.map(({ pageNumber }) => pageNumber),
              entries: input.includeChapterDetails === false ? [] : detail.entries,
            },
            urls: { listenUrl: detail.listenUrl },
          });
        }
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
        if (hasPremiumBookMarker(story.features)) {
          const detail = premiumListeningDetails(story, accessLevel, resolvedLocale);
          const page = detail.entries.find(({ pageNumber }) => pageNumber === input.chapterNumber);
          return toStructuredToolResult(page ? copy.chapterReady : copy.audioUnavailable, {
            locale: resolvedLocale,
            accessLevel,
            status: page ? 'ok' : 'audio_not_available',
            page,
            listenUrl: detail.listenUrl,
          });
        }
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
        ensureChapterBook(
          ensureStoryOwnership(await storyService.getStoryById(storyId), author.authorId),
        );

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
        ensureChapterBook(
          ensureStoryOwnership(await storyService.getStoryById(storyId), author.authorId),
        );
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
        if (hasPremiumBookMarker(story.features)) {
          return toStructuredToolResult(copy.generationPreview, {
            locale: resolvedLocale,
            status: 'open_listener',
            storyId: story.storyId,
            listenUrl: resolveAuthorStoryListenUrl(resolvedLocale, story.storyId),
            guidance: 'Choose the narrator and confirm the credit cost in the Mythoria listener.',
          });
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
        const defaultVoice = getRecommendedVoice(provider, story.targetAudience);
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

        const started = await startProductGeneration({
          actionType: 'audiobook_generation',
          authorId: author.authorId,
          userId: author.clerkUserId,
          storyId: story.storyId,
          idempotencyKey: `mcp:audiobook:${author.authorId}:${story.storyId}:${crypto.randomUUID()}`,
          creditsSpent: requiredCredits,
          creditEventType: 'audioBookGeneration',
        });
        const runId = started.request.runId;

        if (started.request.status === 'pending') {
          await storyService.updateStory(story.storyId, {
            audiobookStatus: 'generating',
          });

          let messageId: string;
          try {
            messageId = String(
              await publishAudiobookRequest({
                storyId: story.storyId,
                runId,
                voice: selectedVoice,
                includeBackgroundMusic,
                language: input.language ?? story.storyLanguage,
                timestamp: new Date().toISOString(),
              }),
            );
          } catch (error) {
            console.error('Failed to publish audiobook request from MCP tool:', error);
            await storyService.updateStory(story.storyId, {
              audiobookStatus: null,
            });
            await compensateProductGeneration(runId, 'queue', 'pubsub_publish_failed');
            throw new McpToolUserError('Failed to queue audiobook generation workflow.');
          }
          await markProductGenerationQueued(runId, messageId);
        }

        const refreshedStory = ensureStoryOwnership(
          await storyService.getStoryById(story.storyId),
          author.authorId,
        );
        const newBalance = started.remainingCredits;
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

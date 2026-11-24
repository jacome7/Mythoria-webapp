import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import crypto from 'crypto';
import { z } from 'zod';
import {
  chapterService,
  characterService,
  creditService,
  pricingService,
  storyCharacterService,
  storyService,
} from '@/db/services';
import { startStoryGeneration } from '@/lib/story-generation';
import { hasPremiumBookMarker, premiumBookType } from '@/lib/premium-children-book/contract';
import { CHARACTER_AGES, CHARACTER_ROLES } from '@/types/character-enums';
import { GraphicalStyle, LiteraryPersona, NovelStyle, TargetAudience } from '@/types/story-enums';
import {
  APP_BASE_URL,
  resolveAuthorStoryListenUrl,
  resolveAuthorStoryReadUrl,
  resolveStoryApiUrl,
  resolveStoryWebUrl,
} from './app-links';
import { type McpAuthContext, McpAuthError, requireAuthor } from './auth';
import { createTrackedJobDescriptor } from './job-tracking';
import {
  ensureChapterBook,
  ensureStoryOwnership,
  type StoryChapterRecord,
  type StoryRecord,
} from './story-access';
import {
  getCreditServiceLabel,
  hasAnyGenerationFeature,
  normalizeGenerationFeatures,
} from './story-generation-options';
import { executeTool } from './tool-execution';
import {
  normalizeSearchText,
  resolveLocale,
  sanitizeOptionalText,
  stripHtml,
  truncateText,
} from './tool-input';
import { PROTECTED_TOOL_SCOPE, resolveToolRequiredScopes, TOOL_NAMES } from './tool-metadata';
import { McpToolUserError, toStructuredToolResult } from './tool-result';

function resolveAuthorStoryReadChapterUrl(
  locale: string,
  storyId: string,
  chapterNumber: number,
): string {
  return `${APP_BASE_URL}/${locale}/stories/read/${storyId}/chapter/${chapterNumber}`;
}

function resolvePublicStoryChapterUrl(locale: string, slug: string, chapterNumber: number): string {
  return `${APP_BASE_URL}/${locale}/p/${slug}/chapter/${chapterNumber}`;
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

type AuthorStoryRecord = Awaited<ReturnType<typeof storyService.getStoriesByAuthor>>[number];

type RequiredStoryField = 'title' | 'targetAudience' | 'novelStyle' | 'graphicalStyle';

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

type StoryReadMode = 'full' | 'summary' | 'excerpt';

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

const STORY_STATUS_VALUES = ['temporary', 'draft', 'writing', 'published'] as const;

const STORY_LIBRARY_SORT_FIELDS = ['updatedAt', 'createdAt', 'title'] as const;

const STORY_LIBRARY_SORT_DIRECTIONS = ['asc', 'desc'] as const;

const STORY_READ_MODES = ['full', 'summary', 'excerpt'] as const;

const STORY_READ_NAVIGATION_DIRECTIONS = ['next', 'previous'] as const;

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

function getStoryCreationCopy(locale: string): StoryCreationCopy {
  return STORY_CREATION_COPY[locale] ?? STORY_CREATION_COPY['en-US'];
}

function getStoryReadingCopy(locale: string): StoryReadingCopy {
  return STORY_READING_COPY[locale] ?? STORY_READING_COPY['en-US'];
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
    if (hasPremiumBookMarker(story.features)) return actions;
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
  const isPremiumBook = hasPremiumBookMarker(story.features);

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
    chapterCount: isPremiumBook ? 0 : (story.chapterCount ?? null),
    ...(isPremiumBook ? { bookType: premiumBookType } : {}),
    hasAudio: !isPremiumBook && Boolean(story.hasAudio),
    storyGenerationStatus: story.storyGenerationStatus ?? null,
    storyGenerationCompletedPercentage: story.storyGenerationCompletedPercentage ?? 0,
    isPublic: story.isPublic,
    isFeatured: story.isFeatured,
    slug: story.slug,
    urls: {
      readUrl,
      listenUrl: !isPremiumBook && story.hasAudio ? listenUrl : null,
      editUrl: isPremiumBook && story.status === 'published' ? null : editUrl,
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

function getRequiredFieldLabels(locale: string) {
  return REQUIRED_STORY_FIELD_LABELS[locale] ?? REQUIRED_STORY_FIELD_LABELS['en-US'];
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

export function registerStoryTools(server: McpServer, authContext: McpAuthContext) {
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
        if (hasPremiumBookMarker(story.features) && story.status === 'published') {
          const url =
            accessLevel === 'owner'
              ? resolveAuthorStoryReadUrl(resolvedLocale, story.storyId)
              : story.slug
                ? resolveStoryWebUrl(resolvedLocale, story.slug)
                : null;
          return toStructuredToolResult('Open the illustrated book in the Mythoria web reader.', {
            locale: resolvedLocale,
            status: 'web_reader',
            accessLevel,
            story: { id: story.storyId, title: story.title, bookType: premiumBookType },
            readUrl: url,
          });
        }
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
        ensureChapterBook(story);
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
        ensureChapterBook(story);
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
        if (hasPremiumBookMarker(story.features)) {
          throw new McpToolUserError(
            'Review and start this illustrated book in the Mythoria web wizard.',
          );
        }
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

        const generation = await startStoryGeneration({
          authorId: author.authorId,
          clerkUserId: author.clerkUserId,
          storyId: story.storyId,
          idempotencyKey: crypto.randomUUID(),
          features,
          expectedBookType: 'standard',
          deliveryAddress: input.deliveryAddress,
          customAuthor: sanitizeOptionalText(input.customAuthor),
          dedicationMessage: sanitizeOptionalText(input.dedicationMessage),
        });
        const runId = generation.runId;

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
              transactions: [],
              previousBalance: currentBalance,
              newBalance: generation.remainingCredits,
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

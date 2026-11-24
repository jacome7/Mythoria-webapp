import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { faqService } from '@/db/services';
import { NovelStyle, TargetAudience } from '@/types/story-enums';
import type { McpAuthContext } from './auth';
import { getDiscoveryCopy } from './discovery-copy';
import { executeTool } from './tool-execution';
import {
  normalizeSearchText,
  resolveLocale,
  sanitizeOptionalText,
  stripHtml,
  truncateText,
} from './tool-input';
import { TOOL_NAMES } from './tool-metadata';
import { toJsonContent, toStructuredToolResult } from './tool-result';

type FaqSectionWithEntries = Awaited<ReturnType<typeof faqService.getFaqData>>[number];

type FaqEntryWithSection = Awaited<ReturnType<typeof faqService.searchFaqs>>[number];

type FaqEntry = FaqSectionWithEntries['entries'][number];

type StoryCoachIntent = 'creative_coaching' | 'product_info' | 'story_creation_request';

type StoryCoachCopy = {
  ready: string;
  faqRouting: string;
  creationRouting: string;
  coachingGuidance: string;
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

function getStoryCoachCopy(locale: string): StoryCoachCopy {
  return STORY_COACH_COPY[locale] ?? STORY_COACH_COPY['en-US'];
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

export function registerHelpTools(server: McpServer, authContext: McpAuthContext) {
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

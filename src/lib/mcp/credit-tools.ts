import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { creditService, pricingService } from '@/db/services';
import { type McpAuthContext, requireAuthor } from './auth';
import {
  getCreditServiceLabel,
  hasAnyGenerationFeature,
  normalizeGenerationFeatures,
  type StoryGenerationFeatures,
} from './story-generation-options';
import { executeTool } from './tool-execution';
import { resolveLocale } from './tool-input';
import { resolveToolRequiredScopes, TOOL_NAMES } from './tool-metadata';
import { McpToolUserError, toJsonContent, toStructuredToolResult } from './tool-result';

type CreditEligibilityAction = 'ebook' | 'audiobook' | 'print' | 'story_generation';

type CreditEligibilityCopy = {
  eligibilityReady: string;
  insufficientCredits: string;
  eligible: string;
  policyGuidance: string;
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

function getCreditEligibilityCopy(locale: string): CreditEligibilityCopy {
  return CREDIT_ELIGIBILITY_COPY[locale] ?? CREDIT_ELIGIBILITY_COPY['en-US'];
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

export function registerCreditTools(server: McpServer, authContext: McpAuthContext) {
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

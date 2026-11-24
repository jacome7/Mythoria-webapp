import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DEFAULT_CURRENCY } from '@/config/currency';
import { creditPackagesService, paymentService } from '@/db/services';
import { type McpAuthContext, requireAuthor } from './auth';
import { executeTool } from './tool-execution';
import { resolveToolRequiredScopes, TOOL_NAMES } from './tool-metadata';
import { toJsonContent } from './tool-result';

export function registerTransactionTools(server: McpServer, authContext: McpAuthContext) {
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

import { config } from 'dotenv';

import { fiscalDocumentService } from '@/db/services/fiscal-documents';

config({ path: '.env.local', quiet: true });
config({ path: '.env', override: false, quiet: true });

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 25;
  const orderIds = process.argv
    .filter((arg) => arg.startsWith('--order-id='))
    .map((arg) => arg.split('=')[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const results = await fiscalDocumentService.retryDueDocuments(
    Number.isFinite(limit) ? limit : 25,
    orderIds,
  );

  console.log(
    JSON.stringify(
      {
        attempted: results.length,
        documents: results.map((result) =>
          result.document
            ? {
                id: result.document.id,
                orderId: result.document.orderId,
                status: result.document.status,
                docNum: result.document.docNum,
                fullDocNumber: result.document.fullDocNumber,
                lastError: result.document.lastError,
                retrySkippedReason: result.retrySkippedReason || null,
              }
            : null,
        ),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error('KeyInvoice fiscal retry failed:', error);
  process.exit(1);
});

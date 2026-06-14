import { config } from 'dotenv';

import { fiscalDocumentService } from '@/db/services/fiscal-documents';

config({ path: '.env.local', quiet: true });
config({ path: '.env', override: false, quiet: true });

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 25;
  const results = await fiscalDocumentService.retryDueDocuments(
    Number.isFinite(limit) ? limit : 25,
  );

  console.log(
    JSON.stringify(
      {
        attempted: results.length,
        documents: results.map((document) =>
          document
            ? {
                id: document.id,
                orderId: document.orderId,
                status: document.status,
                fullDocNumber: document.fullDocNumber,
                lastError: document.lastError,
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

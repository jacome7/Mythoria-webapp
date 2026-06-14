import { config } from 'dotenv';

import { keyInvoiceClient } from '@/lib/keyinvoice/client';
import { DEFAULT_KEYINVOICE_DOC_TYPE, loadKeyInvoiceIssueConfig } from '@/lib/keyinvoice/config';

config({ path: '.env.local', quiet: true });
config({ path: '.env', override: false, quiet: true });

async function main() {
  const docType = process.env.KEYINVOICE_DOC_TYPE || DEFAULT_KEYINVOICE_DOC_TYPE;

  const [company, taxes, series, paymentMethods] = await Promise.all([
    keyInvoiceClient.company(),
    keyInvoiceClient.getTaxes(),
    keyInvoiceClient.listDocumentSeries(docType),
    keyInvoiceClient.listPaymentMethods(),
  ]);

  console.log('KeyInvoice company');
  console.log({
    name: company.Name,
    vatin: company.VATIN,
    email: company.Email,
  });

  console.log('Tax rows');
  console.table(taxes.Taxes);

  console.log(`Document series for DocType ${docType}`);
  console.table(series.Series);

  console.log('Payment methods');
  console.table(paymentMethods.Payments);

  try {
    const issueConfig = loadKeyInvoiceIssueConfig();
    const productChecks = await Promise.all(
      Object.entries(issueConfig.productIdsByPackageKey).map(async ([packageKey, idProduct]) => ({
        packageKey,
        idProduct,
        exists: await keyInvoiceClient.productExists(idProduct),
      })),
    );

    console.log('Configured credit package products');
    console.table(productChecks);

    const missingProducts = productChecks.filter((product) => !product.exists);
    if (missingProducts.length) {
      console.error('Missing configured KeyInvoice products:', missingProducts);
      process.exitCode = 1;
    }
  } catch (error) {
    console.warn(
      'Issue configuration is incomplete. Discovery succeeded, but issuing will fail closed until env mappings are configured.',
    );
    console.warn(error instanceof Error ? error.message : error);
  }
}

main().catch((error) => {
  console.error('KeyInvoice discovery failed:', error);
  process.exit(1);
});

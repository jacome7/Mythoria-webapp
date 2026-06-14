import { config } from 'dotenv';

import { keyInvoiceClient } from '@/lib/keyinvoice/client';
import { DEFAULT_KEYINVOICE_DOC_TYPE, loadKeyInvoiceIssueConfig } from '@/lib/keyinvoice/config';

config({ path: '.env.local', quiet: true });
config({ path: '.env', override: false, quiet: true });

interface SmokeResult {
  warnings: string[];
  failures: string[];
}

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function logOk(message: string): void {
  console.log(`[ok] ${message}`);
}

function logWarn(result: SmokeResult, message: string): void {
  result.warnings.push(message);
  console.warn(`[warn] ${message}`);
}

function logFail(result: SmokeResult, message: string): void {
  result.failures.push(message);
  console.error(`[fail] ${message}`);
}

function hasSixPercentTax(taxes: Awaited<ReturnType<typeof keyInvoiceClient.getTaxes>>): boolean {
  return taxes.Taxes.some((tax) => Number(tax.Value) === 6);
}

function parseJsonRecord(result: SmokeResult, name: string): Record<string, string> | null {
  const raw = env(name);
  if (!raw) {
    logWarn(result, `${name} is missing.`);
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      logWarn(result, `${name} must be a JSON object.`);
      return null;
    }

    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string' || !value.trim()) {
        logWarn(result, `${name}.${key} must be a non-empty string.`);
        return null;
      }
      record[key] = value.trim();
    }
    return record;
  } catch {
    logWarn(result, `${name} is not valid JSON.`);
    return null;
  }
}

async function main() {
  const result: SmokeResult = { warnings: [], failures: [] };
  const strict = process.argv.includes('--strict');

  if (!env('KEYINVOICE_API_KEY')) {
    logFail(result, 'KEYINVOICE_API_KEY is missing from the environment.');
    process.exit(1);
  }

  const docType = env('KEYINVOICE_DOC_TYPE') || DEFAULT_KEYINVOICE_DOC_TYPE;
  console.log(`Running KeyInvoice smoke test for DocType ${docType}`);

  await keyInvoiceClient.authenticate();
  logOk('Authenticated with KeyInvoice and received a session id.');

  const [company, pricesWithVat, taxes, series, paymentMethods] = await Promise.all([
    keyInvoiceClient.company(),
    keyInvoiceClient.verifyUserInsertionPricesWithVAT(),
    keyInvoiceClient.getTaxes(),
    keyInvoiceClient.listDocumentSeries(docType),
    keyInvoiceClient.listPaymentMethods(),
  ]);

  logOk(
    `Company endpoint responded${company.Name ? ` for ${company.Name}` : ''}${
      company.VATIN ? ` (${company.VATIN})` : ''
    }.`,
  );

  if (pricesWithVat) {
    logOk('API user is configured for VAT-included line prices.');
  } else {
    logFail(
      result,
      'API user is configured for prices without VAT. Mythoria currently sends VAT-included gross prices.',
    );
  }

  logOk(`Read ${taxes.Taxes.length} tax rows.`);
  if (hasSixPercentTax(taxes)) {
    logOk('Found a 6% VAT tax row.');
  } else {
    logWarn(result, 'No 6% VAT tax row was returned by getTaxes.');
  }

  logOk(`Read ${series.Series.length} document series rows for DocType ${docType}.`);
  if (!series.Series.length) {
    logWarn(result, `No document series was returned for DocType ${docType}.`);
  }

  logOk(`Read ${paymentMethods.Payments.length} payment methods.`);
  if (!paymentMethods.Payments.length) {
    logWarn(result, 'No payment methods were returned.');
  }

  const configuredPaymentMethodId = env('KEYINVOICE_PAYMENT_METHOD_ID_STRIPE');
  if (configuredPaymentMethodId) {
    const configuredPaymentMethodExists = paymentMethods.Payments.some(
      (method) => method.IdPayment === configuredPaymentMethodId,
    );
    if (configuredPaymentMethodExists) {
      logOk('Configured Stripe payment method id exists in KeyInvoice.');
    } else {
      logWarn(
        result,
        'KEYINVOICE_PAYMENT_METHOD_ID_STRIPE is set but was not found in listPaymentMethods.',
      );
    }
  } else {
    logWarn(result, 'KEYINVOICE_PAYMENT_METHOD_ID_STRIPE is missing.');
  }

  const taxIdByRate = parseJsonRecord(result, 'KEYINVOICE_TAX_ID_BY_RATE_JSON');
  if (taxIdByRate?.['6']) {
    const configuredTaxExists = taxes.Taxes.some((tax) => tax.Id === taxIdByRate['6']);
    if (configuredTaxExists) {
      logOk('Configured 6% tax id exists in KeyInvoice.');
    } else {
      logWarn(result, 'Configured 6% tax id was not found in getTaxes.');
    }
  } else {
    logWarn(result, 'KEYINVOICE_TAX_ID_BY_RATE_JSON must include a "6" mapping.');
  }

  const fallbackTaxId = env('KEYINVOICE_FALLBACK_TAX_ID');
  if (fallbackTaxId) {
    const fallbackTaxExists = taxes.Taxes.some((tax) => tax.Id === fallbackTaxId);
    if (fallbackTaxExists) {
      logOk('Configured fallback tax id exists in KeyInvoice.');
    } else {
      logWarn(result, 'KEYINVOICE_FALLBACK_TAX_ID was not found in getTaxes.');
    }
  } else {
    logWarn(result, 'KEYINVOICE_FALLBACK_TAX_ID is missing.');
  }

  const configuredSeriesId = env('KEYINVOICE_DOC_SERIES_ID');
  if (configuredSeriesId) {
    const configuredSeriesExists = series.Series.some((row) => row.IdSerie === configuredSeriesId);
    if (configuredSeriesExists) {
      logOk('Configured document series id exists in KeyInvoice.');
    } else {
      logWarn(result, 'KEYINVOICE_DOC_SERIES_ID was not found for the selected DocType.');
    }
  } else if (series.Series.length === 1) {
    logWarn(
      result,
      `KEYINVOICE_DOC_SERIES_ID is missing. The discovered DocType ${docType} series id is ${series.Series[0].IdSerie}.`,
    );
  }

  const configuredProducts = parseJsonRecord(result, 'KEYINVOICE_PRODUCT_IDS_BY_PACKAGE_KEY_JSON');
  if (configuredProducts) {
    const productChecks = await Promise.all(
      Object.entries(configuredProducts).map(async ([packageKey, idProduct]) => ({
        packageKey,
        idProduct,
        exists: await keyInvoiceClient.productExists(idProduct),
      })),
    );

    for (const product of productChecks) {
      if (product.exists) {
        logOk(`Configured product exists for ${product.packageKey}.`);
      } else {
        logWarn(
          result,
          `Configured product id for ${product.packageKey} was not found in KeyInvoice.`,
        );
      }
    }
  }

  try {
    loadKeyInvoiceIssueConfig();
    logOk('Local KeyInvoice issuing configuration is parseable.');
  } catch (error) {
    logWarn(
      result,
      `Local issuing configuration is incomplete: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (result.failures.length) {
    console.error(
      `KeyInvoice smoke test failed with ${result.failures.length} failure(s) and ${result.warnings.length} warning(s).`,
    );
    process.exit(1);
  }

  if (strict && result.warnings.length) {
    console.error(
      `KeyInvoice smoke test passed API checks but has ${result.warnings.length} warning(s).`,
    );
    process.exit(1);
  }

  console.log(`KeyInvoice smoke test completed with ${result.warnings.length} warning(s).`);
}

main().catch((error) => {
  console.error('KeyInvoice smoke test failed:', error);
  process.exit(1);
});

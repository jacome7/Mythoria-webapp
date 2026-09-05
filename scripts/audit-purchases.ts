import { config } from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  auditPurchases,
  parseAuditDate,
  parseGA4Transactions,
  purchaseAuditCsv,
} from '../src/lib/analytics/purchase-audit';

const HELP = `Read-only purchase audit. Dates are UTC, from inclusive / to exclusive.
Usage: npx tsx scripts/audit-purchases.ts --from 2026-08-05T23:00:00Z --to 2026-09-04T23:00:00Z --output-dir C:\\private\\audit
  --test-author-id UUID   Repeat for confirmed test accounts only.
  --test-order-id UUID    Repeat for confirmed test orders only.
  --ga4-transactions FILE Optional actual GA4 transaction export JSON.
Output: purchases.private.csv (order IDs, no author IDs/PII) + summary.json (aggregates only).
No payment processing, analytics sending, external APIs or business writes.`;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return;
  }
  const values = new Map<string, string[]>();
  const allowed = new Set([
    '--from',
    '--to',
    '--output-dir',
    '--test-author-id',
    '--test-order-id',
    '--ga4-transactions',
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    const value = args[index + 1];
    if (!allowed.has(name) || !value || value.startsWith('--'))
      throw new Error('Invalid audit arguments. Run --help.');
    values.set(name, [...(values.get(name) || []), value]);
  }
  const single = (name: string, required = false) => {
    const list = values.get(name) || [];
    if (list.length > 1 || (required && list.length !== 1))
      throw new Error(`Expected one ${name}.`);
    return list[0];
  };
  const from = parseAuditDate(single('--from', true)!);
  const to = parseAuditDate(single('--to', true)!);
  if (from >= to) throw new Error('Expected from < to.');
  const outputDir = path.resolve(single('--output-dir', true)!);
  if (outputDir.split(path.sep).some((part) => ['public', '.git'].includes(part.toLowerCase()))) {
    throw new Error('Output must be a private directory, outside public and .git paths.');
  }
  const testIds = (name: string) =>
    (values.get(name) || []).map((id) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error('Test author/order IDs must be UUIDs.');
      }
      return id.toLowerCase();
    });
  const ga4File = single('--ga4-transactions');
  const options = {
    from,
    to,
    testAuthorIds: testIds('--test-author-id'),
    testOrderIds: testIds('--test-order-id'),
    ...(ga4File
      ? { ga4Transactions: parseGA4Transactions(JSON.parse(await readFile(ga4File, 'utf8'))) }
      : {}),
  };
  config({ path: '.env.local', quiet: true });
  if (process.env.NODE_ENV === 'test' || process.env.NEXT_PHASE === 'phase-production-build') {
    throw new Error('Refusing mocked build/test database mode.');
  }
  const reader = await import('../src/lib/analytics/purchase-audit-reader');
  try {
    const snapshot = await reader.readPurchaseAuditSnapshot(to);
    const report = auditPurchases(snapshot, options);
    await mkdir(outputDir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(outputDir, 'purchases.private.csv'), purchaseAuditCsv(report.rows), {
      mode: 0o600,
      flag: 'wx',
    });
    await writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(report.summary, null, 2) + '\n',
      { mode: 0o600, flag: 'wx' },
    );
    console.log(JSON.stringify(report.summary, null, 2));
  } finally {
    await reader.closePurchaseAuditConnection();
  }
}

main().catch((error: unknown) => {
  // Do not echo SQL, provider payloads, connection strings or identifiers on failure.
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  console.error(
    `Purchase audit failed${/^[A-Z0-9_]{1,20}$/.test(code) ? ` (${code})` : ''}. Check arguments, private output permissions and read-only DB connectivity. Run --help.`,
  );
  process.exitCode = 1;
});

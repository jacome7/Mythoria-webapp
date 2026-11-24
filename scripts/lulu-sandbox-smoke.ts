import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import * as lulu from '../src/lib/lulu/client';
import { luluPageCountSupported, shippingSchema } from '../src/lib/print/contracts';

const httpsFixture = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
});
const fixtureSchema = z
  .object({
    synthetic: z.literal(true),
    binding: z.enum(['paperback', 'hardcover']),
    pageCount: z.number().int().positive(),
    copies: z.number().int().min(1).max(10),
    shippingAddress: shippingSchema,
    interiorUrl: httpsFixture,
    coverUrl: httpsFixture,
    webhookId: z.string().regex(/^\d+$/).optional(),
  })
  .strict()
  .refine((data) => luluPageCountSupported(data.binding, data.pageCount));
const example = {
  synthetic: true,
  binding: 'paperback',
  pageCount: 32,
  copies: 1,
  shippingAddress: {
    name: 'Synthetic Test',
    street1: 'Test Street 1',
    city: 'Porto',
    postcode: '4000-001',
    country_code: 'PT',
    phone_number: '+351210000000',
    email: 'synthetic@example.org',
  },
  interiorUrl: 'https://example.org/synthetic/interior.pdf',
  coverUrl: 'https://example.org/synthetic/cover.pdf',
};

async function reconcile(externalId: string) {
  for (let i = 0; i < 8; i++) {
    const job = await lulu.findLuluJob(externalId);
    if (job) return job;
    if (i < 7) await delay(2500);
  }
  throw new Error('EXACT_JOB_NOT_YET_FOUND');
}

async function finish(externalId: string, knownJobId?: string) {
  const job = await reconcile(externalId);
  if (knownJobId && knownJobId !== job.id) throw new Error('JOB_ID_MISMATCH');
  const detail = await lulu.getLuluJob(job.id);
  if (detail.id !== job.id) throw new Error('JOB_ID_MISMATCH');
  console.log('Exact external job and line references matched. Sandbox job ID:', job.id);
  for (let i = 0; i < 30; i++) {
    const { name } = await lulu.getLuluJobStatus(job.id);
    if (name === 'CANCELED') {
      console.log('Cancellation confirmed.');
      return;
    }
    if (name === 'UNPAID' || name === 'PRODUCTION_DELAYED') {
      try {
        const costs = await lulu.getLuluJobCosts(job.id);
        console.log('Job costs:', costs.currency, costs.total);
      } catch (err) {
        if (!(err instanceof lulu.LuluHttpError && [400, 404, 409].includes(err.status))) throw err;
        console.log('Supplier costs unavailable in this sandbox payment state.');
      } finally {
        const after = await lulu.cancelLuluJob(job.id);
        if (after.name !== 'CANCELED') throw new Error('CANCELLATION_UNCONFIRMED');
        console.log('Cancellation confirmed.');
      }
      return;
    }
    if (!['CREATED', 'PAYMENT_IN_PROGRESS'].includes(name)) throw new Error('JOB_NOT_CANCELABLE');
    if (i < 29) await delay(5000);
  }
  throw new Error('JOB_STATUS_PENDING');
}

async function main() {
  const { values } = parseArgs({
    options: {
      'run-sandbox': { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      fixture: { type: 'string' },
      resume: { type: 'string' },
    },
  });
  if ((values['run-sandbox'] && values['dry-run']) || (values.resume && !values['run-sandbox']))
    throw new Error('INVALID_ARGUMENTS');
  const execute = values['run-sandbox'] === true;
  if (execute && process.env.LULU_PRINT_ENVIRONMENT !== 'sandbox')
    throw new Error('SANDBOX_REQUIRED');
  if (values.resume) {
    const run = z.uuid().parse(values.resume);
    await finish('mythoria-sandbox-' + run);
    return;
  }
  if (execute && !values.fixture) throw new Error('SYNTHETIC_FIXTURE_REQUIRED');
  const fixture = fixtureSchema.parse(
    values.fixture ? JSON.parse(await readFile(values.fixture, 'utf8')) : example,
  );
  const podPackageId = lulu.LULU_SKUS[fixture.binding];
  console.log(
    'Validated synthetic fixture for',
    fixture.binding,
    fixture.pageCount,
    'pages and',
    fixture.copies,
    'copies.',
  );
  if (!execute) {
    console.log('Dry run complete. No network requests or supplier jobs.');
    return;
  }
  const run = randomUUID();
  const externalId = 'mythoria-sandbox-' + run;
  console.log('Sandbox run ID:', run);
  const dimensions = await lulu.getLuluCoverDimensions({
    podPackageId,
    pageCount: fixture.pageCount,
  });
  console.log(
    'Sandbox OAuth and cover dimensions verified (points):',
    dimensions.width,
    dimensions.height,
  );
  const input = { ...fixture, externalId, podPackageId, title: 'Mythoria synthetic proof' };
  await lulu.validateLuluFile('interior', { ...input, sourceUrl: input.interiorUrl });
  await lulu.validateLuluFile('cover', { ...input, sourceUrl: input.coverUrl });
  const quote = await lulu.quoteLuluOrder(input);
  console.log('Preflight passed. Tracked quote:', quote.shippingLevel, quote.totalEur, 'EUR.');
  if (fixture.webhookId) {
    await lulu.testLuluSandboxWebhook(fixture.webhookId);
    console.log('Requested a test callback on the supplied sandbox subscription.');
  }
  if (await lulu.findLuluJob(externalId)) throw new Error('DUPLICATE_TEST_REFERENCE');
  // Leave an opaque recovery reference before the only job-creating request.
  const work = join(tmpdir(), 'mythoria-lulu-sandbox');
  await mkdir(work, { recursive: true, mode: 0o700 });
  await writeFile(join(work, run + '.txt'), externalId, { flag: 'wx', mode: 0o600 });
  let submittedId: string | undefined;
  try {
    submittedId = (await lulu.submitLuluJob({ ...input, shippingLevel: quote.shippingLevel })).id;
  } catch {
    console.log('Checking the sandbox for the exact reference after a failed create response.');
  }
  await finish(externalId, submittedId);
}

void main().catch((err: unknown) => {
  // Raw supplier errors and fixture diagnostics may contain addresses or signed PDF URLs.
  const code =
    err instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(err.message)
      ? err.message
      : 'INVALID_FIXTURE_OR_SUPPLIER_RESPONSE';
  console.error('Sandbox check failed:', code);
  process.exitCode = 1;
});

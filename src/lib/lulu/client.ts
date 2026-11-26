import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { checkLuluAddress } from './address-review';

export { LULU_SKUS } from './products';

function config() {
  const mode = process.env.LULU_PRINT_ENVIRONMENT;
  if (mode !== 'sandbox' && mode !== 'production') throw new Error('LULU_ENVIRONMENT_REQUIRED');
  const key = process.env.LULU_PRINT_CLIENT_KEY?.trim();
  const secret = process.env.LULU_PRINT_CLIENT_SECRET?.trim();
  if (!key || !secret) throw new Error('LULU_CREDENTIALS_REQUIRED');
  return {
    base: mode === 'production' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com',
    key,
    secret,
  };
}

export function luluConfigured() {
  try {
    config();
    return z.string().email().safeParse(process.env.LULU_PRINT_CONTACT_EMAIL).success;
  } catch {
    return false;
  }
}
async function clientSecret() {
  return config().secret;
}
let token: { value: string; expires: number; identity: string } | undefined;
async function accessToken() {
  const { base, key, secret } = config();
  const secretFingerprint = createHmac('sha256', secret).update(key).digest('hex').slice(0, 8);
  const identity = [base, key, secretFingerprint].join('/');
  if (token && token.identity === identity && token.expires > Date.now()) return token.value;
  const response = await fetch(base + '/auth/realms/glasstree/protocol/openid-connect/token', {
    method: 'POST',
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: 'Basic ' + Buffer.from(key + ':' + (await clientSecret())).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) throw new Error('LULU_AUTH_FAILED');
  const result = z
    .object({ access_token: z.string().min(1), expires_in: z.number().positive() })
    .parse(await response.json());
  token = {
    value: result.access_token,
    expires: Date.now() + (result.expires_in - 30) * 1000,
    identity,
  };
  return token.value;
}

function sanitizeLuluDetail(text: string): string | undefined {
  const cleaned = text
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.slice(0, 400) : undefined;
}

export class LuluHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail?: string,
  ) {
    super('LULU_HTTP_' + status);
  }
}

export class LuluValidationError extends Error {
  constructor(
    public readonly code: string,
    public readonly detail?: string,
  ) {
    super(code);
  }
}
async function request(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await fetch(config().base + path, {
      method,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: 'Bearer ' + (await accessToken()),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (resp.status === 401 && attempt === 0) {
      token = undefined;
      continue;
    }
    if (!resp.ok) {
      const detail = sanitizeLuluDetail(await resp.text().catch(() => ''));
      throw new LuluHttpError(resp.status, detail);
    }
    if (resp.status === 204 || resp.headers.get('content-length') === '0') return null;
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  }
  throw new Error('LULU_AUTH_FAILED');
}

const positive = z
  .union([z.string().regex(/^\d+(\.\d+)?$/), z.number()])
  .transform(Number)
  .pipe(z.number().positive().finite());
const subtotal = z.string().regex(/^\d{1,12}(?:\.\d{1,8})?$/);
const jobCostResponse = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  total_cost_incl_tax: z.unknown().optional(),
  total_cost_excl_tax: z.unknown().optional(),
  fees: z.array(z.unknown()).optional().catch(undefined),
});

function readJobCostSummary(input: unknown) {
  const response = jobCostResponse.safeParse(input);
  if (!response.success) return null;
  const { currency, total_cost_incl_tax, total_cost_excl_tax, fees } = response.data;
  const total = positive.safeParse(total_cost_incl_tax).data;
  const amountExclTax = subtotal.safeParse(total_cost_excl_tax).data;
  if (total === undefined && amountExclTax === undefined) return null;
  return { currency, total, amountExclTax, fees: fees ?? [] };
}

export type LuluJobCostSummary = NonNullable<ReturnType<typeof readJobCostSummary>>;
const id = z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]).transform(String);
export async function getLuluCoverDimensions(input: { podPackageId: string; pageCount: number }) {
  return z.object({ width: positive, height: positive }).parse(
    await request('/cover-dimensions/', {
      pod_package_id: input.podPackageId,
      interior_page_count: input.pageCount,
      unit: 'pt',
    }),
  );
}

export type LuluShippingAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  postcode: string;
  country_code: string;
  state_code?: string;
  phone_number: string;
  email: string;
  recipient_tax_id?: string;
};
type OrderFiles = {
  externalId: string;
  podPackageId: string;
  copies: number;
  shippingAddress: LuluShippingAddress;
  interiorUrl: string;
  coverUrl: string;
};
const validation = z.object({
  id,
  status: z.string().nullish(),
  page_count: z.coerce.number().nullish(),
  source_page_count: z.coerce.number().nullish(),
  errors: z.array(z.unknown()).nullish(),
  warnings: z.array(z.unknown()).nullish(),
  valid_pod_package_ids: z.array(z.string()).nullish(),
});
export type LuluFileValidationResult = {
  id: string;
  sourcePageCount: number;
  normalizedPageCount: number;
  addedBlankPages: number;
  warnings: string[];
};
export async function validateLuluFileDetailed(
  kind: 'interior' | 'cover',
  input: {
    sourceUrl: string;
    podPackageId: string;
    pageCount: number;
    requirePackageMatch?: boolean;
  },
  savedId?: string,
  remember?: (id: string) => Promise<void>,
): Promise<LuluFileValidationResult> {
  const endpoint = '/validate-' + kind + '/';
  const validationId =
    savedId ||
    z.object({ id }).parse(
      await request(endpoint, {
        source_url: input.sourceUrl,
        pod_package_id: input.podPackageId,
        ...(kind === 'cover' ? { interior_page_count: input.pageCount } : {}),
      }),
    ).id;
  if (!savedId) await remember?.(validationId);
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = validation.parse(await request(endpoint + encodeURIComponent(validationId) + '/'));
    if (r.id !== validationId) throw new Error('LULU_VALIDATION_ID_MISMATCH');
    if (r.errors?.length || r.status === 'ERROR') {
      const detail = sanitizeLuluDetail(JSON.stringify(r.errors ?? r.status));
      throw new LuluValidationError('LULU_' + kind.toUpperCase() + '_REJECTED', detail);
    }
    if (r.status === 'NORMALIZED') {
      const pageCountOk =
        r.page_count === input.pageCount ||
        (r.source_page_count === input.pageCount &&
          input.pageCount % 2 === 1 &&
          r.page_count === input.pageCount + 1);
      const packageOk = input.requirePackageMatch
        ? Boolean(
            r.valid_pod_package_ids?.some(
              (packageId) =>
                packageId.replaceAll('.', '') === input.podPackageId.replaceAll('.', ''),
            ),
          )
        : !r.valid_pod_package_ids || r.valid_pod_package_ids.includes(input.podPackageId);
      if (kind === 'interior' && (!pageCountOk || !packageOk)) {
        const detail = sanitizeLuluDetail(
          `expected=${input.pageCount} source=${r.source_page_count ?? 'n/a'} normalized=${r.page_count ?? 'n/a'} package=${input.podPackageId}`,
        );
        throw new LuluValidationError('LULU_INTERIOR_MISMATCH', detail);
      }
      const warnings = (r.warnings ?? [])
        .map((w) => sanitizeLuluDetail(typeof w === 'string' ? w : JSON.stringify(w)) ?? '')
        .filter(Boolean);
      const normalizedPageCount =
        kind === 'interior' ? (r.page_count ?? input.pageCount) : input.pageCount;
      return {
        id: validationId,
        sourcePageCount: r.source_page_count ?? input.pageCount,
        normalizedPageCount,
        addedBlankPages:
          kind === 'interior' ? Math.max(0, normalizedPageCount - input.pageCount) : 0,
        warnings,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
  }
  throw new Error('LULU_VALIDATION_PENDING');
}
export async function validateLuluFile(
  kind: 'interior' | 'cover',
  input: {
    sourceUrl: string;
    podPackageId: string;
    pageCount: number;
    requirePackageMatch?: boolean;
  },
  savedId?: string,
  remember?: (id: string) => Promise<void>,
) {
  return (await validateLuluFileDetailed(kind, input, savedId, remember)).id;
}

const nonNegative = z
  .union([z.string().regex(/^\d+(\.\d+)?$/), z.number()])
  .transform(Number)
  .pipe(z.number().nonnegative().finite());

export async function quoteLuluOrder(
  input: Pick<OrderFiles, 'shippingAddress' | 'copies' | 'podPackageId'> & { pageCount: number },
) {
  const {
    country_code: country,
    state_code: state,
    city,
    postcode,
    street1,
    street2,
  } = input.shippingAddress;
  const line_items = [
    { pod_package_id: input.podPackageId, quantity: input.copies, page_count: input.pageCount },
  ];
  const services = z.array(z.object({ level: z.string().min(1), traceable: z.boolean() })).parse(
    await request('/shipping-options/', {
      currency: 'EUR',
      line_items,
      shipping_address: { country, state, city, postcode, street1, street2 },
    }),
  );
  const quotes = [];
  for (const { level } of services.filter((s) => s.traceable)) {
    const q = z
      .object({
        currency: z.literal('EUR'),
        total_cost_incl_tax: positive,
        total_cost_excl_tax: nonNegative.optional(),
        total_tax: nonNegative.optional(),
        line_item_costs: z
          .array(z.object({ total_cost_excl_tax: nonNegative.optional() }))
          .optional(),
        shipping_cost: z
          .object({
            total_cost_excl_tax: nonNegative.optional(),
            total_cost_incl_tax: nonNegative.optional(),
          })
          .optional(),
        shipping_address: z
          .object({
            warnings: z.unknown().optional(),
            suggested_address: z.record(z.string(), z.unknown()).nullish(),
          })
          .optional(),
      })
      .parse(
        await request('/print-job-cost-calculations/', {
          currency: 'EUR',
          shipping_option: level,
          line_items,
          shipping_address: input.shippingAddress,
        }),
      );
    checkLuluAddress(
      input.shippingAddress,
      q.shipping_address?.suggested_address,
      q.shipping_address?.warnings,
    );
    const lineItemCost = q.line_item_costs?.[0]?.total_cost_excl_tax;
    const shipCost = q.shipping_cost?.total_cost_excl_tax;
    quotes.push({
      shippingLevel: level,
      totalEur: q.total_cost_incl_tax,
      ...(lineItemCost !== undefined ? { printCostExclTaxEur: lineItemCost } : {}),
      ...(shipCost !== undefined ? { shippingCostExclTaxEur: shipCost } : {}),
      ...(q.total_tax !== undefined ? { totalTaxEur: q.total_tax } : {}),
    });
  }
  if (!quotes.length) throw new Error('LULU_NO_TRACKED_SHIPPING');
  return quotes.sort(
    (a, b) => a.totalEur - b.totalEur || a.shippingLevel.localeCompare(b.shippingLevel),
  )[0];
}
export async function prepareLuluQuote(input: OrderFiles & { pageCount: number }) {
  await validateLuluFile('interior', { ...input, sourceUrl: input.interiorUrl });
  await validateLuluFile('cover', { ...input, sourceUrl: input.coverUrl });
  return quoteLuluOrder(input);
}

const trackingUrls = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((v) => (typeof v === 'string' ? [v] : (v ?? [])));
const shipment = z.object({
  tracking_urls: trackingUrls,
  tracking_id: z.string().nullish(),
  carrier_name: z.string().nullish(),
});
const job = z.object({
  order_id: z.union([z.string(), z.number()]).nullish(),
  id,
  status: z.union([z.string(), z.object({ name: z.string() })]),
  external_id: z.string().nullish(),
  date_created: z.string().nullish(),
  costs: z.unknown().optional(),
  line_items: z
    .array(
      z.object({
        external_id: z.string().nullish(),
        id: id.optional(),
        printable_id: z.union([z.string(), z.number()]).nullish(),
        tracking_urls: trackingUrls,
        status: z
          .object({ name: z.string(), changed: z.string().nullish(), messages: shipment.nullish() })
          .nullish(),
        carrier_name: z.string().nullish(),
        tracking_id: z.string().nullish(),
        carrier: z.string().nullish(),
      }),
    )
    .default([]),
});
function toJob(value: z.infer<typeof job>) {
  const createdAt = z.iso.datetime({ offset: true }).safeParse(value.date_created).data;
  const costs = readJobCostSummary(value.costs);
  return {
    id: value.id,
    externalId: value.external_id,
    orderId: value.order_id,
    status: typeof value.status === 'string' ? value.status : value.status.name,
    tracking: value.line_items
      .flatMap((line) => [...line.tracking_urls, ...(line.status?.messages?.tracking_urls ?? [])])
      .filter((url) => /^https?:\/\//i.test(url)),
    lines: value.line_items,
    createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    costs: costs ?? undefined,
  };
}
export async function submitLuluJob(input: OrderFiles & { shippingLevel: string; title: string }) {
  const contact_email = z.string().email().parse(process.env.LULU_PRINT_CONTACT_EMAIL);
  return toJob(
    job.parse(
      await request('/print-jobs/', {
        external_id: input.externalId,
        contact_email,
        shipping_level: input.shippingLevel,
        production_delay: 60,
        shipping_address: input.shippingAddress,
        line_items: [
          {
            external_id: input.externalId + '-1',
            title: input.title,
            quantity: input.copies,
            printable_normalization: {
              pod_package_id: input.podPackageId,
              interior: { source_url: input.interiorUrl },
              cover: { source_url: input.coverUrl },
            },
          },
        ],
      }),
    ),
  );
}
export async function getLuluJob(jobId: string) {
  const detail = job.parse(await request('/print-jobs/' + id.parse(jobId) + '/'));
  // Lulu can publish tracking in the status resource before it appears on the line item.
  const current = await getLuluJobStatus(jobId);
  for (const line of detail.line_items) {
    const latest = current.line_item_statuses?.find((entry) => entry.line_item_id === line.id);
    if (!latest) continue;
    const messages = latest.messages;
    line.tracking_urls = [
      ...new Set([
        ...line.tracking_urls,
        ...(line.status?.messages?.tracking_urls ?? []),
        ...(messages?.tracking_urls ?? []),
      ]),
    ];
    line.tracking_id = messages?.tracking_id ?? line.tracking_id;
    line.carrier_name = messages?.carrier_name ?? line.carrier_name;
    line.status = {
      name: latest.name,
      changed: latest.changed ?? line.status?.changed,
      messages: messages ?? line.status?.messages,
    };
  }
  return toJob({ ...detail, status: current.name });
}
export async function findLuluJob(externalId: string) {
  const page = z
    .object({ results: z.array(job), next: z.string().nullish() })
    .parse(await request('/print-jobs/?search=' + encodeURIComponent(externalId)));
  const exact = page.results.filter(
    (j) =>
      j.external_id === externalId &&
      j.line_items.length === 1 &&
      j.line_items[0].external_id === externalId + '-1',
  );
  if (
    exact.length > 1 ||
    page.next ||
    page.results.some((j) => j.external_id === externalId && !exact.includes(j))
  )
    throw new Error('LULU_RECONCILIATION_REQUIRED');
  return exact.length ? toJob(exact[0]) : null;
}
export async function verifyLuluWebhook(raw: Buffer, signature: string) {
  const encoding = /^[0-9a-f]{64}$/i.test(signature)
    ? 'hex'
    : /^[A-Za-z0-9+/]{43}=$/.test(signature)
      ? 'base64'
      : null;
  if (!encoding) return false;
  const expected = createHmac('sha256', await clientSecret())
    .update(raw)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, encoding));
}

export async function getLuluJobStatus(jobId: string) {
  return z
    .object({
      name: z.string(),
      line_item_statuses: z
        .array(
          z.object({
            line_item_id: id,
            name: z.string(),
            changed: z.string().nullish(),
            messages: shipment.nullish(),
          }),
        )
        .nullish(),
    })
    .parse(await request('/print-jobs/' + id.parse(jobId) + '/status/'));
}
export async function cancelLuluJob(jobId: string) {
  await request('/print-jobs/' + id.parse(jobId) + '/status/', { name: 'CANCELED' }, 'PUT');
  return getLuluJobStatus(jobId);
}
export async function testLuluSandboxWebhook(webhookId: string) {
  if (config().base !== 'https://api.sandbox.lulu.com') throw new Error('LULU_SANDBOX_REQUIRED');
  const validatedId = z
    .string()
    .regex(/^[\w-]+$/)
    .parse(webhookId);
  return request(
    '/webhooks/' + encodeURIComponent(validatedId) + '/test-submission/PRINT_JOB_STATUS_CHANGED/',
    undefined,
    'POST',
  );
}

const webhookSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  topics: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});
export type LuluWebhook = z.infer<typeof webhookSchema>;

const webhookListSchema = z.object({
  results: z.array(webhookSchema).default([]),
  next: z.string().nullish(),
});

const LULU_WEBHOOK_TOPICS = ['PRINT_JOB_STATUS_CHANGED'] as const;

function normalizeWebhookUrl(value: string) {
  try {
    return new URL(value.trim()).href;
  } catch {
    return value.trim();
  }
}

export async function listLuluWebhooks(): Promise<LuluWebhook[]> {
  const results: LuluWebhook[] = [];
  let nextPath: string | null = '/webhooks/';
  for (let page = 0; page < 10 && nextPath; page++) {
    const parsed = webhookListSchema.parse(await request(nextPath));
    results.push(...parsed.results);
    if (!parsed.next) {
      nextPath = null;
      continue;
    }
    try {
      const nextUrl = new URL(parsed.next, config().base);
      nextPath = nextUrl.pathname + nextUrl.search;
    } catch {
      nextPath = null;
    }
  }
  return results;
}

export async function subscribeLuluWebhook(
  url: string,
  topics: readonly string[] = LULU_WEBHOOK_TOPICS,
): Promise<LuluWebhook> {
  return webhookSchema.parse(
    await request('/webhooks/', {
      url: normalizeWebhookUrl(url),
      topics: [...topics],
    }),
  );
}

export async function updateLuluWebhook(
  webhookId: string,
  patch: { url?: string; topics?: readonly string[]; is_active?: boolean },
): Promise<LuluWebhook> {
  const validatedId = z
    .string()
    .regex(/^[\w-]+$/)
    .parse(webhookId);
  return webhookSchema.parse(
    await request(
      '/webhooks/' + encodeURIComponent(validatedId) + '/',
      {
        ...(patch.url ? { url: normalizeWebhookUrl(patch.url) } : {}),
        ...(patch.topics ? { topics: [...patch.topics] } : {}),
        ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
      },
      'PATCH',
    ),
  );
}

export async function ensureLuluWebhook(
  url: string,
  topics: readonly string[] = LULU_WEBHOOK_TOPICS,
): Promise<{ webhook: LuluWebhook; action: 'unchanged' | 'created' | 'updated' }> {
  const targetUrl = normalizeWebhookUrl(url);
  const existing = (await listLuluWebhooks()).find(
    (entry) => normalizeWebhookUrl(entry.url) === targetUrl,
  );
  if (!existing) {
    return {
      webhook: await subscribeLuluWebhook(targetUrl, topics),
      action: 'created',
    };
  }
  const missingTopics = topics.filter((topic) => !existing.topics.includes(topic));
  if (!existing.is_active || missingTopics.length > 0) {
    return {
      webhook: await updateLuluWebhook(existing.id, {
        is_active: true,
        topics: [...new Set([...existing.topics, ...topics])],
      }),
      action: 'updated',
    };
  }
  return { webhook: existing, action: 'unchanged' };
}

let webhookEnsureMemo: { key: string; expiresAt: number } | undefined;
let webhookEnsureInFlight: Promise<LuluWebhook | null> | undefined;

export function resetLuluWebhookCacheForTests() {
  webhookEnsureMemo = undefined;
  webhookEnsureInFlight = undefined;
}

export function resolvePublicLuluWebhookUrl(): string | null {
  const base =
    process.env.LULU_WEBHOOK_BASE_URL?.trim() || process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (!base) return null;
  try {
    const target = new URL('/api/print/lulu/webhook', base);
    if (
      target.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '::1'].includes(target.hostname)
    ) {
      return null;
    }
    return target.href;
  } catch {
    return null;
  }
}

export async function ensureConfiguredLuluWebhook(): Promise<LuluWebhook | null> {
  if (!luluConfigured()) return null;
  const targetUrl = resolvePublicLuluWebhookUrl();
  if (!targetUrl) return null;
  const { base, key } = config();
  const memoKey = `${base}:${key}:${targetUrl}`;
  if (webhookEnsureMemo?.key === memoKey && webhookEnsureMemo.expiresAt > Date.now()) {
    return null;
  }
  if (!webhookEnsureInFlight) {
    webhookEnsureInFlight = ensureLuluWebhook(targetUrl, LULU_WEBHOOK_TOPICS)
      .then(({ webhook }) => {
        webhookEnsureMemo = { key: memoKey, expiresAt: Date.now() + 6 * 60 * 60_000 };
        return webhook;
      })
      .finally(() => {
        webhookEnsureInFlight = undefined;
      });
  }
  return webhookEnsureInFlight;
}

export async function getLuluJobCosts(jobId: string) {
  const costs = readJobCostSummary(await request('/print-jobs/' + id.parse(jobId) + '/costs/'));
  if (!costs) throw new Error('LULU_JOB_COSTS_UNAVAILABLE');
  return costs;
}

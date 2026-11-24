import { createHmac, timingSafeEqual } from 'node:crypto';
import { GoogleAuth } from 'google-auth-library';
import { z } from 'zod';

export { LULU_SKUS } from './products';

function config() {
  const mode = process.env.LULU_PRINT_ENVIRONMENT;
  if (mode !== 'sandbox' && mode !== 'production') throw new Error('LULU_ENVIRONMENT_REQUIRED');
  const key = process.env.LULU_PRINT_CLIENT_KEY;
  const resource = process.env.LULU_PRINT_SECRET_VERSION;
  if (
    !key ||
    !resource ||
    !/^projects\/[\w-]+\/secrets\/[\w-]+\/versions\/(latest|\d+)$/.test(resource)
  )
    throw new Error('LULU_CREDENTIALS_REQUIRED');
  return {
    base: mode === 'production' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com',
    key,
    resource,
  };
}

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
export function luluConfigured() {
  try {
    config();
    return z.string().email().safeParse(process.env.LULU_PRINT_CONTACT_EMAIL).success;
  } catch {
    return false;
  }
}
async function clientSecret() {
  const { resource } = config();
  const client = await auth.getClient();
  const { data } = await client.request<{ payload: { data: string } }>({
    url: 'https://secretmanager.googleapis.com/v1/' + resource + ':access',
  });
  if (!data.payload?.data) throw new Error('LULU_SECRET_UNAVAILABLE');
  return Buffer.from(data.payload.data, 'base64').toString('utf8');
}
let token: { value: string; expires: number; identity: string } | undefined;
async function accessToken() {
  const { base, key, resource } = config();
  const identity = [base, key, resource].join('/');
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

export class LuluHttpError extends Error {
  constructor(public readonly status: number) {
    super('LULU_HTTP_' + status);
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
    if (!resp.ok) throw new LuluHttpError(resp.status);
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
  errors: z.array(z.unknown()).nullish(),
  valid_pod_package_ids: z.array(z.string()).nullish(),
});
export async function validateLuluFile(
  kind: 'interior' | 'cover',
  input: { sourceUrl: string; podPackageId: string; pageCount: number },
  savedId?: string,
  remember?: (id: string) => Promise<void>,
) {
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
    if (r.errors?.length || r.status === 'ERROR')
      throw new Error('LULU_' + kind.toUpperCase() + '_REJECTED');
    if (r.status === 'NORMALIZED') {
      if (
        kind === 'interior' &&
        (r.page_count !== input.pageCount ||
          (r.valid_pod_package_ids && !r.valid_pod_package_ids.includes(input.podPackageId)))
      )
        throw new Error('LULU_INTERIOR_MISMATCH');
      return validationId;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000)));
  }
  throw new Error('LULU_VALIDATION_PENDING');
}

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
    const suggested = q.shipping_address?.suggested_address;
    if (
      suggested &&
      Object.entries(suggested).some(
        ([key, value]) =>
          value != null &&
          String(value).trim() !==
            String(input.shippingAddress[key as keyof LuluShippingAddress] ?? '').trim(),
      )
    )
      throw new Error('LULU_ADDRESS_CONFIRMATION_REQUIRED');
    quotes.push({ shippingLevel: level, totalEur: q.total_cost_incl_tax });
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
  return {
    id: value.id,
    externalId: value.external_id,
    orderId: value.order_id,
    status: typeof value.status === 'string' ? value.status : value.status.name,
    tracking: value.line_items
      .flatMap((line) => [...line.tracking_urls, ...(line.status?.messages?.tracking_urls ?? [])])
      .filter((url) => /^https?:\/\//i.test(url)),
    lines: value.line_items,
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
  return request(
    '/webhooks/' + id.parse(webhookId) + '/test-submission/PRINT_JOB_STATUS_CHANGED/',
    undefined,
    'POST',
  );
}

export async function getLuluJobCosts(jobId: string) {
  const result = z
    .object({
      currency: z.string(),
      total_cost_incl_tax: positive,
      fees: z.array(z.unknown()).optional(),
    })
    .parse(await request('/print-jobs/' + id.parse(jobId) + '/costs/'));
  return { currency: result.currency, total: result.total_cost_incl_tax, fees: result.fees ?? [] };
}

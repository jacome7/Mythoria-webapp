import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import type { Client, ClientConfig } from 'pg';
import type Stripe from 'stripe';

type StripeConstructor = typeof import('stripe').default;
type StripeClientConfig = NonNullable<ConstructorParameters<StripeConstructor>[1]>;

type CliOptions = {
  start: Date;
  end: Date;
  toleranceMinutes: number;
  failOnAnomaly: boolean;
  allowTestStripeKey: boolean;
};

type StripeMode = 'live' | 'test' | 'unknown';

type StripeChargeRecord = {
  id: string;
  paymentIntentId: string | null;
  amount: number;
  currency: string;
  createdAt: string;
  status: string | null;
  paid: boolean;
  refunded: boolean;
  metadata: Record<string, string>;
};

type AdminOrderRecord = {
  orderId: string;
  authorId: string;
  amount: number;
  currency: string;
  status: string;
  providerOrderId: string | null;
  providerPublicId: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: unknown;
};

type AdminOrderModeSummary = {
  live: { count: number; amount: number };
  test: { count: number; amount: number };
  unknown: { count: number; amount: number };
};

type MatchRecord = {
  stripeChargeId: string;
  adminOrderId: string;
  amount: number;
  currency: string;
  timeDeltaSeconds: number;
  matchedBy: 'payment_intent' | 'metadata_order_id' | 'amount_time';
};

const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_TOLERANCE_MINUTES = 15;
const STRIPE_API_VERSION = '2026-04-22.dahlia';

function loadLocalEnv() {
  for (const filename of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;

    for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const separator = line.indexOf('=');
      if (separator === -1) continue;

      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function parseDate(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid --${label} date: ${value}`);
  }
  return parsed;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let end = new Date();
  let start: Date | null = null;
  let hours = DEFAULT_LOOKBACK_HOURS;
  let toleranceMinutes = DEFAULT_TOLERANCE_MINUTES;
  let failOnAnomaly = false;
  let allowTestStripeKey = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--start' && next) {
      start = parseDate(next, 'start');
      i += 1;
    } else if (arg === '--end' && next) {
      end = parseDate(next, 'end');
      i += 1;
    } else if (arg === '--hours' && next) {
      hours = Number(next);
      i += 1;
    } else if (arg === '--tolerance-minutes' && next) {
      toleranceMinutes = Number(next);
      i += 1;
    } else if (arg === '--fail-on-anomaly') {
      failOnAnomaly = true;
    } else if (arg === '--allow-test-stripe-key') {
      allowTestStripeKey = true;
    } else if (arg === '--help') {
      process.stdout.write(
        [
          'Usage: npm run revenue:sentinel -- [--hours 24] [--start ISO] [--end ISO] [--tolerance-minutes 15] [--fail-on-anomaly] [--allow-test-stripe-key]',
          '',
          'Reads Stripe charges and local payment_orders for the same Stripe mode, then prints stable JSON.',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error('--hours must be a positive number');
  }
  if (!Number.isFinite(toleranceMinutes) || toleranceMinutes <= 0) {
    throw new Error('--tolerance-minutes must be a positive number');
  }

  start ??= new Date(end.getTime() - hours * 60 * 60 * 1000);
  if (start >= end) {
    throw new Error('--start must be before --end');
  }

  return { start, end, toleranceMinutes, failOnAnomaly, allowTestStripeKey };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

async function getDbClient(): Promise<Client> {
  const { Client } = await import('pg');
  const host = requireEnv('DB_HOST');
  const port = Number(process.env.DB_PORT || '5432');
  const database = process.env.DB_NAME || 'mythoria_db';
  const user = requireEnv('DB_USER');
  const password = requireEnv('DB_PASSWORD');
  const isVpcConnection = host.startsWith('10.');

  const config: ClientConfig = {
    host,
    port,
    database,
    user,
    password,
    ssl:
      process.env.DB_SSL === 'true' || (!isVpcConnection && process.env.NODE_ENV === 'production')
        ? { rejectUnauthorized: false }
        : false,
    connectionTimeoutMillis: isVpcConnection ? 5000 : 10000,
  };

  return new Client(config);
}

async function getStripeClient(): Promise<Stripe> {
  const { default: Stripe } = await import('stripe');

  return new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
    apiVersion: (process.env.STRIPE_API_VERSION ||
      STRIPE_API_VERSION) as StripeClientConfig['apiVersion'],
  });
}

function getStripeKeyMode(): StripeMode {
  const key = requireEnv('STRIPE_SECRET_KEY');
  if (key.startsWith('sk_live_')) return 'live';
  if (key.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

async function fetchStripeCharges(options: CliOptions): Promise<StripeChargeRecord[]> {
  const stripe = await getStripeClient();
  const charges: StripeChargeRecord[] = [];
  const iterator = stripe.charges.list({
    created: {
      gte: Math.floor(options.start.getTime() / 1000),
      lte: Math.floor(options.end.getTime() / 1000),
    },
    limit: 100,
  });

  for await (const charge of iterator) {
    if (charge.status !== 'succeeded' || !charge.paid) continue;

    charges.push({
      id: charge.id,
      paymentIntentId:
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id || null,
      amount: charge.amount,
      currency: charge.currency.toLowerCase(),
      createdAt: new Date(charge.created * 1000).toISOString(),
      status: charge.status,
      paid: charge.paid,
      refunded: charge.refunded,
      metadata: charge.metadata || {},
    });
  }

  return charges.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

async function fetchAdminOrders(
  options: CliOptions,
  stripeMode: StripeMode,
): Promise<AdminOrderRecord[]> {
  const toleranceMs = options.toleranceMinutes * 60 * 1000;
  const queryStart = new Date(options.start.getTime() - toleranceMs);
  const queryEnd = new Date(options.end.getTime() + toleranceMs);
  const client = await getDbClient();

  await client.connect();
  try {
    const result = await client.query(
      `
        select
          order_id,
          author_id,
          amount,
          lower(currency) as currency,
          status,
          provider_order_id,
          provider_public_id,
          metadata,
          created_at,
          updated_at
        from payment_orders
        where provider = 'stripe'
          and status = 'completed'
          and updated_at >= $1
          and updated_at <= $2
          and (
            $3 = 'unknown'
            or ($3 = 'live' and provider_order_id like 'cs_live_%')
            or ($3 = 'test' and provider_order_id like 'cs_test_%')
          )
        order by updated_at asc, order_id asc
      `,
      [queryStart.toISOString(), queryEnd.toISOString(), stripeMode],
    );

    return result.rows.map((row) => ({
      orderId: row.order_id,
      authorId: row.author_id,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
      providerOrderId: row.provider_order_id,
      providerPublicId: row.provider_public_id,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      metadata: row.metadata,
    }));
  } finally {
    await client.end();
  }
}

async function fetchAdminOrderModeSummary(options: CliOptions): Promise<AdminOrderModeSummary> {
  const toleranceMs = options.toleranceMinutes * 60 * 1000;
  const queryStart = new Date(options.start.getTime() - toleranceMs);
  const queryEnd = new Date(options.end.getTime() + toleranceMs);
  const client = await getDbClient();

  await client.connect();
  try {
    const result = await client.query(
      `
        select
          case
            when provider_order_id like 'cs_live_%' then 'live'
            when provider_order_id like 'cs_test_%' then 'test'
            else 'unknown'
          end as stripe_mode,
          count(*)::int as count,
          coalesce(sum(amount), 0)::int as amount
        from payment_orders
        where provider = 'stripe'
          and status = 'completed'
          and updated_at >= $1
          and updated_at <= $2
        group by stripe_mode
      `,
      [queryStart.toISOString(), queryEnd.toISOString()],
    );

    const summary: AdminOrderModeSummary = {
      live: { count: 0, amount: 0 },
      test: { count: 0, amount: 0 },
      unknown: { count: 0, amount: 0 },
    };

    for (const row of result.rows) {
      const mode = row.stripe_mode as StripeMode;
      summary[mode] = {
        count: Number(row.count),
        amount: Number(row.amount),
      };
    }

    return summary;
  } finally {
    await client.end();
  }
}

function getMetadataOrderId(charge: StripeChargeRecord): string | null {
  return (
    charge.metadata.orderId || charge.metadata.order_id || charge.metadata.mythoriaOrderId || null
  );
}

function timeDeltaSeconds(a: string, b: string): number {
  return Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000);
}

function reconcile(
  charges: StripeChargeRecord[],
  orders: AdminOrderRecord[],
  toleranceMinutes: number,
) {
  const unmatchedOrders = new Set(orders.map((order) => order.orderId));
  const matched: MatchRecord[] = [];
  const duplicateAdminMatches: Array<{ stripeChargeId: string; adminOrderIds: string[] }> = [];
  const toleranceSeconds = toleranceMinutes * 60;

  for (const charge of charges) {
    const candidates = orders.filter(
      (order) => order.amount === charge.amount && order.currency === charge.currency,
    );

    const paymentIntentMatches = candidates.filter(
      (order) => charge.paymentIntentId && order.providerPublicId === charge.paymentIntentId,
    );
    const metadataOrderId = getMetadataOrderId(charge);
    const metadataMatches = candidates.filter(
      (order) => metadataOrderId && order.orderId === metadataOrderId,
    );
    const timeMatches = candidates.filter(
      (order) => timeDeltaSeconds(charge.createdAt, order.updatedAt) <= toleranceSeconds,
    );

    const selected =
      paymentIntentMatches[0] ||
      metadataMatches[0] ||
      timeMatches.sort(
        (a, b) =>
          timeDeltaSeconds(charge.createdAt, a.updatedAt) -
          timeDeltaSeconds(charge.createdAt, b.updatedAt),
      )[0];

    if (!selected) continue;

    const exactMatches = paymentIntentMatches.length > 0 ? paymentIntentMatches : metadataMatches;
    const allMatchedIds = new Set(
      exactMatches.length > 0
        ? exactMatches.map((order) => order.orderId)
        : timeMatches.map((order) => order.orderId),
    );
    if (allMatchedIds.size > 1) {
      duplicateAdminMatches.push({
        stripeChargeId: charge.id,
        adminOrderIds: [...allMatchedIds].sort(),
      });
    }

    unmatchedOrders.delete(selected.orderId);
    matched.push({
      stripeChargeId: charge.id,
      adminOrderId: selected.orderId,
      amount: charge.amount,
      currency: charge.currency,
      timeDeltaSeconds: timeDeltaSeconds(charge.createdAt, selected.updatedAt),
      matchedBy: paymentIntentMatches[0]
        ? 'payment_intent'
        : metadataMatches[0]
          ? 'metadata_order_id'
          : 'amount_time',
    });
  }

  const matchedChargeIds = new Set(matched.map((item) => item.stripeChargeId));
  const missingInAdmin = charges.filter((charge) => !matchedChargeIds.has(charge.id));
  const missingInStripe = orders.filter((order) => unmatchedOrders.has(order.orderId));

  return {
    matched,
    missingInAdmin,
    missingInStripe,
    duplicateAdminMatches,
  };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs();
  const stripeMode = getStripeKeyMode();
  if (
    process.env.NODE_ENV === 'production' &&
    stripeMode === 'test' &&
    !options.allowTestStripeKey
  ) {
    throw new Error(
      'Refusing production revenue reconciliation with a Stripe test key. Use a live key or pass --allow-test-stripe-key for explicit test-mode investigation.',
    );
  }

  const [stripeCharges, adminOrders, adminOrderModeSummary] = await Promise.all([
    fetchStripeCharges(options),
    fetchAdminOrders(options, stripeMode),
    fetchAdminOrderModeSummary(options),
  ]);
  const reconciliation = reconcile(stripeCharges, adminOrders, options.toleranceMinutes);
  const anomalyCount =
    reconciliation.missingInAdmin.length +
    reconciliation.missingInStripe.length +
    reconciliation.duplicateAdminMatches.length;

  const output = {
    generatedAt: new Date().toISOString(),
    window: {
      start: options.start.toISOString(),
      end: options.end.toISOString(),
      toleranceMinutes: options.toleranceMinutes,
    },
    sources: {
      stripeMode,
      stripeCharges: stripeCharges.length,
      adminOrders: adminOrders.length,
      adminOrderModeSummary,
    },
    summary: {
      matched: reconciliation.matched.length,
      missingInAdmin: reconciliation.missingInAdmin.length,
      missingInStripe: reconciliation.missingInStripe.length,
      duplicateAdminMatches: reconciliation.duplicateAdminMatches.length,
      anomalyCount,
    },
    matches: reconciliation.matched,
    anomalies: {
      missingInAdmin: reconciliation.missingInAdmin,
      missingInStripe: reconciliation.missingInStripe,
      duplicateAdminMatches: reconciliation.duplicateAdminMatches,
    },
  };

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);

  if (options.failOnAnomaly && anomalyCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

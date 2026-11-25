import { parseArgs } from 'node:util';
import { ensureLuluWebhook, listLuluWebhooks, luluConfigured } from '../src/lib/lulu/client';

async function main() {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      list: { type: 'boolean' },
    },
  });

  if (!luluConfigured()) {
    throw new Error('LULU_CONFIGURATION_INCOMPLETE');
  }

  if (values.list) {
    const hooks = await listLuluWebhooks();
    console.log(
      JSON.stringify(
        hooks.map(({ id, url, topics, is_active }) => ({ id, url, topics, is_active })),
        null,
        2,
      ),
    );
    return;
  }

  const baseUrl =
    values.url || process.env.LULU_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('WEBHOOK_URL_REQUIRED');
  }
  const callbackUrl = new URL('/api/print/lulu/webhook', baseUrl);
  if (callbackUrl.protocol !== 'https:') {
    throw new Error('HTTPS_WEBHOOK_URL_REQUIRED');
  }

  const result = await ensureLuluWebhook(callbackUrl.href, ['PRINT_JOB_STATUS_CHANGED']);
  console.log(
    JSON.stringify(
      {
        action: result.action,
        id: result.webhook.id,
        url: result.webhook.url,
        topics: result.webhook.topics,
        is_active: result.webhook.is_active,
      },
      null,
      2,
    ),
  );
}

void main().catch((err: unknown) => {
  console.error('Lulu webhook setup failed:', err instanceof Error ? err.message : 'UNKNOWN_ERROR');
  process.exitCode = 1;
});

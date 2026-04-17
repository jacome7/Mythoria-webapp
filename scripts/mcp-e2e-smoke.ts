type RpcPayload = {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: Record<string, unknown>;
};

type RpcResponse = {
  jsonrpc: '2.0';
  id: string;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
};

type SmokeCheck = {
  name: string;
  ok: boolean;
  detail?: Record<string, unknown>;
};

function parseCliArgs(argv: string[]) {
  const args = new Map<string, string>();
  for (const entry of argv) {
    if (!entry.startsWith('--')) continue;
    const [key, value] = entry.slice(2).split('=', 2);
    if (key && value) {
      args.set(key, value);
    }
  }

  const baseUrl = args.get('base-url') ?? process.env.MCP_E2E_BASE_URL ?? 'http://localhost:3000';
  const bearerToken = args.get('token') ?? process.env.MCP_E2E_BEARER_TOKEN ?? '';
  return { baseUrl: baseUrl.replace(/\/+$/, ''), bearerToken };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }
  return (await response.json()) as T;
}

async function callRpc(
  baseUrl: string,
  payload: RpcPayload,
  bearerToken = '',
): Promise<RpcResponse> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  };
  if (bearerToken) {
    headers.authorization = `Bearer ${bearerToken}`;
  }

  return fetchJson<RpcResponse>(`${baseUrl}/api/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

function getContentText(result: Record<string, unknown> | undefined) {
  const content = (result?.content ?? []) as Array<{ text?: string }>;
  return content[0]?.text ?? '';
}

async function run() {
  const { baseUrl, bearerToken } = parseCliArgs(process.argv.slice(2));
  const checks: SmokeCheck[] = [];

  try {
    const metadata = await fetchJson<Record<string, unknown>>(
      `${baseUrl}/.well-known/oauth-protected-resource`,
    );
    const scopes = (metadata.scopes_supported ?? []) as string[];
    checks.push({
      name: 'oauth_metadata',
      ok: Boolean(metadata.resource) && scopes.includes('profile'),
      detail: { resource: metadata.resource, scopesSample: scopes.slice(0, 5) },
    });
  } catch (error) {
    checks.push({
      name: 'oauth_metadata',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  try {
    const toolsList = await callRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 'tools-list',
      method: 'tools/list',
      params: {},
    });
    const tools = (toolsList.result?.tools ?? []) as Array<{ name?: string }>;
    const toolNames = tools.map((tool) => tool.name ?? '');
    checks.push({
      name: 'tools_list',
      ok:
        toolNames.includes('mythoria.discovery.ping') &&
        toolNames.includes('mythoria.story.share_state') &&
        toolNames.includes('mythoria.credits.check_eligibility'),
      detail: { count: toolNames.length, sample: toolNames.slice(0, 10) },
    });
  } catch (error) {
    checks.push({
      name: 'tools_list',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  try {
    const resourcesList = await callRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 'resources-list',
      method: 'resources/list',
      params: {},
    });
    const widgets = (
      (resourcesList.result?.resources ?? []) as Array<{ uri?: string; mimeType?: string }>
    )
      .filter((resource) => resource.mimeType === 'text/html;profile=mcp-app')
      .map((resource) => resource.uri ?? '');
    checks.push({
      name: 'resources_list',
      ok: widgets.length >= 3,
      detail: { widgets },
    });
  } catch (error) {
    checks.push({
      name: 'resources_list',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  try {
    const ping = await callRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 'ping',
      method: 'tools/call',
      params: { name: 'mythoria.discovery.ping', arguments: {} },
    });
    const text = getContentText(ping.result);
    checks.push({
      name: 'discovery_ping',
      ok: text === 'ok',
      detail: { response: text },
    });
  } catch (error) {
    checks.push({
      name: 'discovery_ping',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  try {
    const helpSearch = await callRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 'help-search',
      method: 'tools/call',
      params: {
        name: 'mythoria.help.search',
        arguments: {
          locale: 'en-US',
          question: 'How do credits work?',
        },
      },
    });
    const isError = Boolean(helpSearch.result?.isError);
    const payloadText = getContentText(helpSearch.result);
    const payload = payloadText ? (JSON.parse(payloadText) as Record<string, unknown>) : {};
    checks.push({
      name: 'help_search',
      ok: !isError && Array.isArray(payload.matches) && payload.matches.length > 0,
      detail: { isError, matches: Array.isArray(payload.matches) ? payload.matches.length : 0 },
    });
  } catch (error) {
    checks.push({
      name: 'help_search',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  try {
    const authChallenge = await callRpc(baseUrl, {
      jsonrpc: '2.0',
      id: 'auth-anon',
      method: 'tools/call',
      params: { name: 'mythoria.account.story_list', arguments: {} },
    });
    const isError = Boolean(authChallenge.result?.isError);
    const meta = (authChallenge.result?._meta ?? {}) as Record<string, unknown>;
    checks.push({
      name: 'auth_challenge_anonymous',
      ok: isError && Boolean(meta['mcp/www_authenticate']),
      detail: {
        isError,
        challenge: meta['mcp/www_authenticate'],
      },
    });
  } catch (error) {
    checks.push({
      name: 'auth_challenge_anonymous',
      ok: false,
      detail: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  if (bearerToken) {
    try {
      const storyList = await callRpc(
        baseUrl,
        {
          jsonrpc: '2.0',
          id: 'auth-story-list',
          method: 'tools/call',
          params: { name: 'mythoria.account.story_list', arguments: { limit: 3 } },
        },
        bearerToken,
      );
      checks.push({
        name: 'auth_story_list',
        ok: !Boolean(storyList.result?.isError),
        detail: { isError: storyList.result?.isError, message: getContentText(storyList.result) },
      });
    } catch (error) {
      checks.push({
        name: 'auth_story_list',
        ok: false,
        detail: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  } else {
    checks.push({
      name: 'auth_story_list',
      ok: true,
      detail: { skipped: true, reason: 'MCP_E2E_BEARER_TOKEN not provided' },
    });
  }

  const passed = checks.every((check) => check.ok);
  const report = {
    timestampUtc: new Date().toISOString(),
    baseUrl,
    checks,
    allPassed: passed,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!passed) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(
    JSON.stringify(
      {
        timestampUtc: new Date().toISOString(),
        allPassed: false,
        fatal: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

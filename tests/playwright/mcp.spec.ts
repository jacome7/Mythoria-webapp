import { test, expect, type APIRequestContext } from '@playwright/test';

const MCP_ENDPOINT = '/api/mcp';

async function postTool(request: APIRequestContext, tool: string, params?: Record<string, unknown>) {
  return request.post(MCP_ENDPOINT, {
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    data: {
      jsonrpc: '2.0',
      id: `test-${tool}`,
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params ?? {},
      },
    },
  });
}

test.describe('MCP endpoint', () => {
  test('health-check returns ok', async ({ request }) => {
    const response = await postTool(request, 'health-check');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.result?.content?.[0]?.text).toBe('ok');
  });

  test('faq.list returns structured FAQ payload', async ({ request }) => {
    const response = await postTool(request, 'faq.list', { locale: 'en-US' });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}');
    expect(payload.locale).toBe('en-US');
    expect(Array.isArray(payload.sections)).toBeTruthy();
  });

  test('stories.listMine requires auth', async ({ request }) => {
    const response = await postTool(request, 'stories.listMine');
    const body = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toMatch(/Authentication required/i);
  });
});

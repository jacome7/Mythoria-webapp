import { test, expect, type APIRequestContext } from '@playwright/test';

const MCP_ENDPOINT = '/api/mcp';
const protectedScope = 'profile';
const protectedSecuritySchemes = [{ type: 'oauth2', scopes: [protectedScope] }];
const mixedAccessSecuritySchemes = [
  { type: 'noauth' },
  { type: 'oauth2', scopes: [protectedScope] },
];

async function postTool(
  request: APIRequestContext,
  tool: string,
  params?: Record<string, unknown>,
) {
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
  test('oauth protected-resource metadata is published', async ({ request }) => {
    const response = await request.get('/.well-known/oauth-protected-resource');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(typeof body.resource).toBe('string');
    expect(Array.isArray(body.authorization_servers)).toBeTruthy();
    expect(Array.isArray(body.scopes_supported)).toBeTruthy();
    expect(body.scopes_supported).toContain(protectedScope);
  });

  test('mythoria.discovery.ping returns ok', async ({ request }) => {
    const response = await postTool(request, 'mythoria.discovery.ping');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.result?.content?.[0]?.text).toBe('ok');
  });

  test('mythoria.help.browse returns structured FAQ payload', async ({ request }) => {
    const response = await postTool(request, 'mythoria.help.browse', { locale: 'en-US' });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}');
    expect(payload.locale).toBe('en-US');
    expect(Array.isArray(payload.sections)).toBeTruthy();
  });

  test('mythoria.help.search returns ranked FAQ matches', async ({ request }) => {
    const response = await postTool(request, 'mythoria.help.search', {
      locale: 'en-US',
      question: 'How do credits work?',
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.result?.isError).not.toBe(true);
    const payload = JSON.parse(body.result?.content?.[0]?.text ?? '{}');
    expect(payload.locale).toBe('en-US');
    expect(payload.question).toBe('How do credits work?');
    expect(Array.isArray(payload.matches)).toBeTruthy();
    expect(payload.matches.length).toBeGreaterThan(0);
  });

  test('mythoria.coach.story_guidance returns routing/coaching payload', async ({ request }) => {
    const response = await postTool(request, 'mythoria.coach.story_guidance', {
      locale: 'en-US',
      request: 'Help me write a fantasy opening for kids',
      targetAudience: 'children_7-10',
      novelStyle: 'fantasy',
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.result?.structuredContent?.intent).toBeTruthy();
  });

  test('mythoria.account.story_list requires auth', async ({ request }) => {
    const response = await postTool(request, 'mythoria.account.story_list');
    const body = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toMatch(/Authentication required/i);
  });

  test('mythoria.account.story_select requires auth', async ({ request }) => {
    const response = await postTool(request, 'mythoria.account.story_select', { query: 'moon' });
    const body = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(body.result?.isError).toBe(true);
    expect(body.result?.content?.[0]?.text).toMatch(/Authentication required/i);
  });

  test('sharing and credit-eligibility tools require auth', async ({ request }) => {
    const shareResponse = await postTool(request, 'mythoria.story.share_state', {
      storyId: 'story-1',
    });
    const shareBody = await shareResponse.json();
    expect(shareResponse.ok()).toBeTruthy();
    expect(shareBody.result?.isError).toBe(true);
    expect(shareBody.result?.content?.[0]?.text).toMatch(/Authentication required/i);

    const eligibilityResponse = await postTool(request, 'mythoria.credits.check_eligibility', {
      action: 'ebook',
    });
    const eligibilityBody = await eligibilityResponse.json();
    expect(eligibilityResponse.ok()).toBeTruthy();
    expect(eligibilityBody.result?.isError).toBe(true);
    expect(eligibilityBody.result?.content?.[0]?.text).toMatch(/Authentication required/i);
  });

  test('story reading tools expose mixed noauth/oauth security schemes', async ({ request }) => {
    const response = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'tools-list-read',
        method: 'tools/list',
        params: {},
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tool = (body.result?.tools ?? []).find(
      (item: { name?: string }) => item.name === 'mythoria.story.read_overview',
    );

    expect(tool?.securitySchemes).toEqual(mixedAccessSecuritySchemes);
  });

  test('story listening tools expose expected security schemes', async ({ request }) => {
    const response = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'tools-list-audio',
        method: 'tools/list',
        params: {},
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tools = body.result?.tools ?? [];
    const audioStatusTool = tools.find(
      (item: { name?: string }) => item.name === 'mythoria.story.audio_status',
    );
    const voiceCatalogTool = tools.find(
      (item: { name?: string }) => item.name === 'mythoria.story.voice_catalog',
    );

    expect(audioStatusTool?.securitySchemes).toEqual(mixedAccessSecuritySchemes);
    expect(voiceCatalogTool?.securitySchemes).toEqual([{ type: 'noauth' }]);
  });

  test('job-status tool exposes account-read security scheme', async ({ request }) => {
    const response = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'tools-list-jobs',
        method: 'tools/list',
        params: {},
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tool = (body.result?.tools ?? []).find(
      (item: { name?: string }) => item.name === 'mythoria.jobs.status',
    );

    expect(tool?.securitySchemes).toEqual(protectedSecuritySchemes);
  });

  test('tool descriptors expose widget resource bindings', async ({ request }) => {
    const response = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'tools-list-widgets',
        method: 'tools/list',
        params: {},
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    const tools = body.result?.tools ?? [];
    const createDraftTool = tools.find(
      (item: { name?: string }) => item.name === 'mythoria.story.create_draft',
    );
    const storyListTool = tools.find(
      (item: { name?: string }) => item.name === 'mythoria.account.story_list',
    );
    const readTool = tools.find(
      (item: { name?: string }) => item.name === 'mythoria.story.read_overview',
    );

    expect(createDraftTool?._meta?.ui?.resourceUri).toBe('ui://mythoria/story-creation-v1.html');
    expect(storyListTool?._meta?.ui?.resourceUri).toBe('ui://mythoria/story-library-v1.html');
    expect(readTool?._meta?.ui?.resourceUri).toBe('ui://mythoria/story-reader-v1.html');
    expect(createDraftTool?._meta?.['openai/outputTemplate']).toBe(
      'ui://mythoria/story-creation-v1.html',
    );
  });

  test('resources endpoint serves MCP app widgets', async ({ request }) => {
    const listResponse = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'resources-list',
        method: 'resources/list',
        params: {},
      },
    });
    expect(listResponse.ok()).toBeTruthy();
    const listBody = await listResponse.json();
    const resources = listBody.result?.resources ?? [];

    const readerWidget = resources.find(
      (item: { uri?: string }) => item.uri === 'ui://mythoria/story-reader-v1.html',
    );
    expect(readerWidget?.mimeType).toBe('text/html;profile=mcp-app');

    const readResponse = await request.post(MCP_ENDPOINT, {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'resources-read',
        method: 'resources/read',
        params: {
          uri: 'ui://mythoria/story-reader-v1.html',
        },
      },
    });
    expect(readResponse.ok()).toBeTruthy();
    const readBody = await readResponse.json();
    const firstContent = readBody.result?.contents?.[0];
    expect(firstContent?.mimeType).toBe('text/html;profile=mcp-app');
    expect(typeof firstContent?.text).toBe('string');
    expect(firstContent?._meta?.ui?.domain).toBeTruthy();
  });
});

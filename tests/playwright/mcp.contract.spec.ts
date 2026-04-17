import { test, expect, type APIRequestContext } from '@playwright/test';

const MCP_ENDPOINT = '/api/mcp';
const protectedScope = 'profile';
const protectedSecuritySchemes = [{ type: 'oauth2', scopes: [protectedScope] }];
const mixedAccessSecuritySchemes = [
  { type: 'noauth' },
  { type: 'oauth2', scopes: [protectedScope] },
];

type JsonRecord = Record<string, unknown>;

async function postRpc(
  request: APIRequestContext,
  method: string,
  params: Record<string, unknown>,
) {
  return request.post(MCP_ENDPOINT, {
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    data: {
      jsonrpc: '2.0',
      id: `contract-${method}`,
      method,
      params,
    },
  });
}

async function postTool(
  request: APIRequestContext,
  name: string,
  argumentsPayload: Record<string, unknown> = {},
) {
  return postRpc(request, 'tools/call', {
    name,
    arguments: argumentsPayload,
  });
}

function parseJsonContent<T = JsonRecord>(body: JsonRecord): T {
  const text = ((body.result as JsonRecord)?.content as Array<{ text?: string }> | undefined)?.[0]
    ?.text;
  if (!text) {
    throw new Error('Tool result missing content[0].text payload.');
  }
  return JSON.parse(text) as T;
}

test.describe('MCP contract coverage (anonymous)', () => {
  test('tools/list exposes stable namespace, schemas, and no duplicates', async ({ request }) => {
    const response = await postRpc(request, 'tools/list', {});
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as JsonRecord;
    const tools = ((body.result as JsonRecord)?.tools ?? []) as Array<JsonRecord>;

    expect(tools.length).toBeGreaterThanOrEqual(25);

    const names = tools.map((tool) => String(tool.name));
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.startsWith('mythoria.')).toBeTruthy();
    }

    for (const tool of tools) {
      expect(typeof tool.description).toBe('string');
      expect((tool.description as string).length).toBeGreaterThan(8);
      expect(tool.inputSchema).toBeTruthy();
    }
  });

  test('critical tools expose expected scopes and widget bindings', async ({ request }) => {
    const response = await postRpc(request, 'tools/list', {});
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as JsonRecord;
    const tools = ((body.result as JsonRecord)?.tools ?? []) as Array<JsonRecord>;

    const byName = new Map<string, JsonRecord>(tools.map((tool) => [String(tool.name), tool]));

    expect(byName.get('mythoria.story.read_overview')?.securitySchemes).toEqual(
      mixedAccessSecuritySchemes,
    );
    expect(byName.get('mythoria.story.audio_status')?.securitySchemes).toEqual(
      mixedAccessSecuritySchemes,
    );
    expect(byName.get('mythoria.account.story_list')?.securitySchemes).toEqual(
      protectedSecuritySchemes,
    );
    expect(byName.get('mythoria.story.share_create_link')?.securitySchemes).toEqual(
      protectedSecuritySchemes,
    );
    expect(byName.get('mythoria.story.share_revoke_link')?.securitySchemes).toEqual(
      protectedSecuritySchemes,
    );
    expect(byName.get('mythoria.credits.check_eligibility')?.securitySchemes).toEqual(
      protectedSecuritySchemes,
    );

    expect((byName.get('mythoria.account.story_list')?._meta as JsonRecord)?.ui).toEqual({
      resourceUri: 'ui://mythoria/story-library-v1.html',
    });
    expect(
      (byName.get('mythoria.story.read_overview')?._meta as JsonRecord)?.['openai/outputTemplate'],
    ).toBe('ui://mythoria/story-reader-v1.html');
  });

  test('mutation and destructive tools expose safety annotations', async ({ request }) => {
    const response = await postRpc(request, 'tools/list', {});
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as JsonRecord;
    const tools = ((body.result as JsonRecord)?.tools ?? []) as Array<JsonRecord>;
    const byName = new Map<string, JsonRecord>(tools.map((tool) => [String(tool.name), tool]));

    const writeTools = [
      'mythoria.story.create_draft',
      'mythoria.story.update_draft',
      'mythoria.story.add_characters',
      'mythoria.story.start_generation',
      'mythoria.story.export_request',
      'mythoria.story.print_request',
      'mythoria.story.narration_request',
      'mythoria.story.share_create_link',
      'mythoria.story.share_revoke_link',
    ];

    for (const name of writeTools) {
      const annotations = (byName.get(name)?.annotations ?? {}) as JsonRecord;
      expect(annotations.readOnlyHint).toBe(false);
      expect(annotations.openWorldHint).toBe(true);
    }

    const destructiveTools = [
      'mythoria.story.start_generation',
      'mythoria.story.print_request',
      'mythoria.story.narration_request',
      'mythoria.story.share_revoke_link',
    ];
    for (const name of destructiveTools) {
      const annotations = (byName.get(name)?.annotations ?? {}) as JsonRecord;
      expect(annotations.destructiveHint).toBe(true);
    }
  });

  test('help search and browse support product-info question answering', async ({ request }) => {
    const search = await postTool(request, 'mythoria.help.search', {
      locale: 'en-US',
      question: 'How do credits work?',
    });
    expect(search.ok()).toBeTruthy();
    const searchBody = (await search.json()) as JsonRecord;
    expect((searchBody.result as JsonRecord)?.isError).not.toBe(true);
    const searchPayload = parseJsonContent<{
      question: string;
      matches: Array<{ question: string; relevanceScore?: number }>;
      topHits: Array<{ question: string }>;
    }>(searchBody);
    expect(searchPayload.question).toBe('How do credits work?');
    expect(searchPayload.matches.length).toBeGreaterThan(0);
    expect(searchPayload.topHits.length).toBeGreaterThan(0);

    const browse = await postTool(request, 'mythoria.help.browse', { locale: 'en-US' });
    expect(browse.ok()).toBeTruthy();
    const browseBody = (await browse.json()) as JsonRecord;
    expect((browseBody.result as JsonRecord)?.isError).not.toBe(true);
    const browsePayload = parseJsonContent<{ sections: Array<{ key: string }> }>(browseBody);
    expect(browsePayload.sections.length).toBeGreaterThan(0);
  });

  test('anonymous end-user journey discovery -> reading -> listening succeeds for public story', async ({
    request,
  }) => {
    const sampleStory = await postTool(request, 'mythoria.discovery.sample_story_preview', {
      locale: 'en-US',
    });
    expect(sampleStory.ok()).toBeTruthy();
    const sampleBody = (await sampleStory.json()) as JsonRecord;
    expect((sampleBody.result as JsonRecord)?.isError).not.toBe(true);
    const samplePayload = parseJsonContent<{
      available: boolean;
      sample?: { id: string };
    }>(sampleBody);

    expect(samplePayload.available).toBe(true);
    const storyId = samplePayload.sample?.id;
    expect(typeof storyId).toBe('string');

    const overview = await postTool(request, 'mythoria.story.read_overview', {
      locale: 'en-US',
      storyId: storyId as string,
    });
    expect(overview.ok()).toBeTruthy();
    const overviewBody = (await overview.json()) as JsonRecord;
    expect((overviewBody.result as JsonRecord)?.isError).not.toBe(true);
    const overviewStructured = (overviewBody.result as JsonRecord)?.structuredContent as
      | JsonRecord
      | undefined;
    expect(overviewStructured?.status).toBe('ok');
    expect((overviewStructured?.story as JsonRecord)?.id).toBe(storyId);
    expect((overviewStructured?.chapters as JsonRecord)?.total).toBeGreaterThan(0);

    const audio = await postTool(request, 'mythoria.story.audio_status', {
      locale: 'en-US',
      storyId: storyId as string,
    });
    expect(audio.ok()).toBeTruthy();
    const audioBody = (await audio.json()) as JsonRecord;
    expect((audioBody.result as JsonRecord)?.isError).not.toBe(true);
    const audioStructured = (audioBody.result as JsonRecord)?.structuredContent as
      | JsonRecord
      | undefined;
    expect((audioStructured?.story as JsonRecord)?.id).toBe(storyId);
    expect((audioStructured?.status as string).startsWith('audio_')).toBeTruthy();
  });
});

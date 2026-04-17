import { test, expect, type APIRequestContext } from '@playwright/test';

const MCP_ENDPOINT = '/api/mcp';
const bearerToken = process.env.MCP_E2E_BEARER_TOKEN;

type JsonRecord = Record<string, unknown>;

async function postToolAuth(
  request: APIRequestContext,
  name: string,
  argumentsPayload: Record<string, unknown> = {},
) {
  return request.post(MCP_ENDPOINT, {
    headers: {
      authorization: `Bearer ${bearerToken}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    data: {
      jsonrpc: '2.0',
      id: `auth-${name}`,
      method: 'tools/call',
      params: {
        name,
        arguments: argumentsPayload,
      },
    },
  });
}

function resultErrorMessage(body: JsonRecord) {
  return ((body.result as JsonRecord)?.content as Array<{ text?: string }> | undefined)?.[0]?.text;
}

function getAuthenticateChallenges(body: JsonRecord): string[] {
  const raw = ((body.result as JsonRecord)?._meta as JsonRecord | undefined)?.[
    'mcp/www_authenticate'
  ];
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}

function extractRequiredScopeFromChallenge(challenges: string[]) {
  for (const challenge of challenges) {
    const match = challenge.match(/scope="([^"]+)"/i);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function skipOnInsufficientScope(body: JsonRecord, toolName: string) {
  const result = (body.result as JsonRecord) ?? {};
  if (result?.isError !== true) return;
  const challenges = getAuthenticateChallenges(body);
  const hasInsufficientScope = challenges.some((entry) =>
    /error="insufficient_scope"/i.test(entry),
  );
  if (!hasInsufficientScope) return;

  const requiredScope = extractRequiredScopeFromChallenge(challenges);
  const hint = requiredScope ? ` Required scope: ${requiredScope}.` : '';
  test.skip(
    true,
    `Bearer token lacks required OAuth scope for ${toolName}.${hint} Check that the Clerk OAuth app can mint the advertised protected-tool scope.`,
  );
}

test.describe('MCP authenticated flows', () => {
  test.skip(!bearerToken, 'Set MCP_E2E_BEARER_TOKEN to run authenticated MCP E2E coverage.');

  test('authenticated user can list stories and check credits eligibility', async ({ request }) => {
    const listResponse = await postToolAuth(request, 'mythoria.account.story_list', { limit: 5 });
    expect(listResponse.ok()).toBeTruthy();
    const listBody = (await listResponse.json()) as JsonRecord;
    skipOnInsufficientScope(listBody, 'mythoria.account.story_list');
    expect((listBody.result as JsonRecord)?.isError).not.toBe(true);

    const listStructured = (listBody.result as JsonRecord)?.structuredContent as
      | {
          authorId?: string;
          stories?: Array<{ id: string; status: string }>;
        }
      | undefined;
    expect(typeof listStructured?.authorId).toBe('string');
    expect(Array.isArray(listStructured?.stories)).toBeTruthy();

    const eligibilityResponse = await postToolAuth(request, 'mythoria.credits.check_eligibility', {
      locale: 'en-US',
      action: 'ebook',
    });
    expect(eligibilityResponse.ok()).toBeTruthy();
    const eligibilityBody = (await eligibilityResponse.json()) as JsonRecord;
    expect((eligibilityBody.result as JsonRecord)?.isError).not.toBe(true);
    const eligibilityStructured = (eligibilityBody.result as JsonRecord)
      ?.structuredContent as JsonRecord;
    expect((eligibilityStructured?.action as string) === 'ebook').toBeTruthy();
    expect((eligibilityStructured?.eligibility as JsonRecord)?.requiredCredits).toBeGreaterThan(0);
    expect(
      ((eligibilityStructured?.eligibility as JsonRecord)?.availableCredits as number) >= 0,
    ).toBeTruthy();
  });

  test('authenticated sharing lifecycle works for at least one owned story', async ({
    request,
  }) => {
    const listResponse = await postToolAuth(request, 'mythoria.account.story_list', { limit: 20 });
    expect(listResponse.ok()).toBeTruthy();
    const listBody = (await listResponse.json()) as JsonRecord;
    skipOnInsufficientScope(listBody, 'mythoria.account.story_list');
    expect((listBody.result as JsonRecord)?.isError).not.toBe(true);
    const listStructured = (listBody.result as JsonRecord)?.structuredContent as
      | { stories?: Array<{ id: string; status: string }> }
      | undefined;
    const stories = listStructured?.stories ?? [];
    let storyId: string | undefined =
      stories.find((story) => story.status !== 'temporary')?.id ?? stories[0]?.id;

    if (!storyId) {
      const draftResponse = await postToolAuth(request, 'mythoria.story.create_draft', {
        locale: 'en-US',
        title: `E2E Share Test ${Date.now()}`,
      });
      expect(draftResponse.ok()).toBeTruthy();
      const draftBody = (await draftResponse.json()) as JsonRecord;
      const draftIsError = (draftBody.result as JsonRecord)?.isError === true;
      if (draftIsError) {
        test.skip(
          true,
          'Unable to create a draft story for sharing lifecycle (likely missing the protected-tool OAuth scope).',
        );
      }
      storyId =
        ((((draftBody.result as JsonRecord)?.structuredContent as JsonRecord)?.story as JsonRecord)
          ?.storyId as string | undefined) ?? undefined;
    }

    test.skip(!storyId, 'No story available to run sharing lifecycle.');

    const stateResponse = await postToolAuth(request, 'mythoria.story.share_state', {
      storyId: storyId as string,
      includeInactiveLinks: false,
    });
    expect(stateResponse.ok()).toBeTruthy();
    const stateBody = (await stateResponse.json()) as JsonRecord;
    expect((stateBody.result as JsonRecord)?.isError).not.toBe(true);

    const createResponse = await postToolAuth(request, 'mythoria.story.share_create_link', {
      storyId: storyId as string,
      mode: 'private_view',
      expiresInDays: 7,
    });
    expect(createResponse.ok()).toBeTruthy();
    const createBody = (await createResponse.json()) as JsonRecord;
    expect((createBody.result as JsonRecord)?.isError).not.toBe(true);
    const createdLinkId = ((
      ((createBody.result as JsonRecord)?.structuredContent as JsonRecord)?.sharing as JsonRecord
    )?.linkId ?? null) as string | null;
    expect(typeof createdLinkId).toBe('string');

    const revokeResponse = await postToolAuth(request, 'mythoria.story.share_revoke_link', {
      storyId: storyId as string,
      linkId: createdLinkId as string,
      confirmRevoke: true,
    });
    expect(revokeResponse.ok()).toBeTruthy();
    const revokeBody = (await revokeResponse.json()) as JsonRecord;
    expect((revokeBody.result as JsonRecord)?.isError).not.toBe(true);
    const revokedCount = ((
      ((revokeBody.result as JsonRecord)?.structuredContent as JsonRecord)?.result as JsonRecord
    )?.revokedCount ?? 0) as number;
    expect(revokedCount).toBeGreaterThanOrEqual(1);
  });

  test('invalid bearer token is rejected with auth challenge metadata', async ({ request }) => {
    const response = await request.post(MCP_ENDPOINT, {
      headers: {
        authorization: 'Bearer invalid-token',
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      data: {
        jsonrpc: '2.0',
        id: 'invalid-token-test',
        method: 'tools/call',
        params: {
          name: 'mythoria.account.story_list',
          arguments: {},
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as JsonRecord;
    expect((body.result as JsonRecord)?.isError).toBe(true);
    expect(resultErrorMessage(body)).toMatch(/invalid|Authentication required|Access token/i);
    expect(
      ((body.result as JsonRecord)?._meta as JsonRecord)?.['mcp/www_authenticate'],
    ).toBeTruthy();
  });
});

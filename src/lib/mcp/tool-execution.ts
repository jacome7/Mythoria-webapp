import { type McpAuthContext, McpAuthError, toMcpAuthErrorResult } from './auth';
import { resolveLocale } from './tool-input';
import { attachToolUiMetadata } from './tool-metadata';
import { type McpToolResult, McpToolUserError, toUserErrorResult } from './tool-result';

type ToolInput = Record<string, unknown> | undefined;

function extractLocaleFromInput(input?: ToolInput): string | null {
  const localeValue = input?.locale;
  return typeof localeValue === 'string' ? resolveLocale(localeValue) : null;
}

function toSerializableError(error: unknown): {
  message: string;
  code?: string | number;
  oauthError?: string;
  requiredScopes?: string[];
} {
  if (error instanceof McpAuthError) {
    return {
      message: error.message,
      code: error.status,
      oauthError: error.oauthError,
      requiredScopes: error.requiredScopes,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'Unknown error' };
}

export async function executeTool(
  toolName: string,
  authContext: McpAuthContext,
  input: ToolInput,
  run: () => Promise<McpToolResult>,
): Promise<McpToolResult> {
  const startedAt = Date.now();
  const locale = extractLocaleFromInput(input);
  const authState = authContext.author ? 'authenticated' : 'anonymous';

  console.info(
    '[mcp-tool]',
    JSON.stringify({
      event: 'start',
      toolName,
      authState,
      locale,
      startedAt: new Date(startedAt).toISOString(),
    }),
  );

  try {
    const rawResult = await run();
    const result = attachToolUiMetadata(toolName, rawResult);
    console.info(
      '[mcp-tool]',
      JSON.stringify({
        event: 'success',
        toolName,
        authState,
        locale,
        latencyMs: Date.now() - startedAt,
      }),
    );
    return result;
  } catch (error) {
    const serialized = toSerializableError(error);
    console.info(
      '[mcp-tool]',
      JSON.stringify({
        event: 'error',
        toolName,
        authState,
        locale,
        latencyMs: Date.now() - startedAt,
        error: serialized,
      }),
    );
    if (error instanceof McpAuthError) {
      return toMcpAuthErrorResult(error);
    }
    if (error instanceof McpToolUserError) {
      return toUserErrorResult(error);
    }
    throw error;
  }
}

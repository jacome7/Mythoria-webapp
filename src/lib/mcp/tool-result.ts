export type McpToolResult = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
};

export class McpToolUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpToolUserError';
  }
}

export function toJsonContent(payload: unknown): McpToolResult {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function toStructuredToolResult(
  summary: string,
  structuredContent: Record<string, unknown>,
  meta?: Record<string, unknown>,
): McpToolResult {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent,
    ...(meta ? { _meta: meta } : {}),
  };
}

export function toUserErrorResult(error: McpToolUserError): McpToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: error.message,
      },
    ],
    structuredContent: {
      error: {
        message: error.message,
      },
    },
  };
}

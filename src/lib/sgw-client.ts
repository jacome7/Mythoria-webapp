// Story Generation Workflow client helper
// Centralizes base URL and x-api-key header injection for all server-to-server calls

type FetchInput = string | URL | Request;

function getBaseUrl(): string {
  return process.env.STORY_GENERATION_WORKFLOW_URL || 'http://localhost:8080';
}

function getApiKey(): string | undefined {
  return process.env.STORY_GENERATION_WORKFLOW_API_KEY || undefined;
}

export function sgwUrl(path: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

export function sgwHeaders(extra?: HeadersInit): HeadersInit {
  const key = getApiKey();
  // Build headers using the Web Headers API to avoid any-casts and support all HeadersInit shapes
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (key) headers.set('x-api-key', key);
  if (extra) {
    const extraHeaders = new Headers(extra);
    extraHeaders.forEach((value, name) => headers.set(name, value));
  }
  return headers;
}

export async function sgwFetch(input: FetchInput, init?: RequestInit): Promise<Response> {
  const url =
    typeof input === 'string' || input instanceof URL ? input.toString() : (input as Request).url;
  const finalUrl = url.startsWith('http') ? url : sgwUrl(url);
  const mergedInit: RequestInit = {
    ...init,
    headers: sgwHeaders(init?.headers as HeadersInit),
  };
  return fetch(finalUrl, mergedInit);
}

// Named object to avoid import/no-anonymous-default-export warnings
const sgwClient = { sgwFetch, sgwHeaders, sgwUrl };
export default sgwClient;

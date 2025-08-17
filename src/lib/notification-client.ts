// Centralized client for Notification Engine requests
// Injects API key header consistently and builds absolute URLs

export function notificationUrl(path: string): string {
  const base = process.env.NOTIFICATION_ENGINE_URL || 'http://localhost:8081';
  const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
}

export function notificationHeaders(extra?: HeadersInit): HeadersInit {
  const apiKey = process.env.NOTIFICATION_ENGINE_API_KEY || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    // Provide X-API-Key as a backup for implementations that expect it
    headers['X-API-Key'] = apiKey;
  }
  return { ...headers, ...(extra || {}) };
}

export async function notificationFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = input.startsWith('http') ? input : notificationUrl(input);
  const mergedInit: RequestInit = {
    ...(init || {}),
    headers: notificationHeaders(init?.headers as HeadersInit),
  };
  return fetch(url, mergedInit);
}

import { NextResponse } from 'next/server';

/** Largest request body accepted by the respondent endpoints (characters). */
export const MAX_RESPONDENT_BODY_LENGTH = 250_000;

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function respondentJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Uniform response for malformed, forged, unknown or holdout tokens (no enumeration). */
export function respondentNotFound(): NextResponse {
  return respondentJson({ error: 'not_found' }, 404);
}

export type JsonBodyResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

/** Reads a size-capped JSON body. */
export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const text = await request.text();
  if (text.length > MAX_RESPONDENT_BODY_LENGTH) {
    return { ok: false, response: respondentJson({ error: 'payload_too_large' }, 413) };
  }
  try {
    return { ok: true, body: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, response: respondentJson({ error: 'invalid_json' }, 400) };
  }
}

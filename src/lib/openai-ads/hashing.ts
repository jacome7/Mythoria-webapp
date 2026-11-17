/**
 * OpenAI Ads identifier normalization (isomorphic) and the browser SHA-256 hasher.
 *
 * Server code must hash with `hashForOpenAi` from `./hashing.server` (node:crypto); this file is
 * safe to import from client components.
 */

export type OpenAiHashKind = 'email' | 'phone' | 'external_id' | 'name';

/** Whitespace and ASCII punctuation. Non-ASCII letters (accents) are deliberately kept. */
const NAME_STRIP_PATTERN = /[\s!-/:-@[-`{-~]/g;

type Input = string | null | undefined;

/** Trim + lowercase. Returns `undefined` when the value cannot be an email address. */
export function normalizeEmail(value: Input): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 && normalized.includes('@') ? normalized : undefined;
}

/**
 * Digits only, without the leading `+` and leading zeros (`+1 (415) 555-2671` -> `14155552671`).
 * Returns `undefined` unless 8-15 digits remain.
 */
export function normalizePhone(value: Input): string | undefined {
  if (typeof value !== 'string') return undefined;
  const digits = value.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : undefined;
}

/** Trim only; case is preserved. */
export function normalizeExternalId(value: Input): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/** Lowercase, without whitespace and ASCII punctuation (`O'Connor` -> `oconnor`). Accents stay. */
export function normalizeName(value: Input): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.toLowerCase().replace(NAME_STRIP_PATTERN, '');
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeForOpenAi(kind: OpenAiHashKind, value: Input): string | undefined {
  switch (kind) {
    case 'email':
      return normalizeEmail(value);
    case 'phone':
      return normalizePhone(value);
    case 'external_id':
      return normalizeExternalId(value);
    case 'name':
      return normalizeName(value);
  }
}

/** SHA-256 of the UTF-8 bytes as 64-char lowercase hex, via Web Crypto (`crypto.subtle`). */
export async function sha256HexBrowser(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Browser counterpart of `hashForOpenAi`: normalizes, then hashes. Resolves to `undefined` when
 * the value is missing or invalid, or when Web Crypto is unavailable (insecure context).
 */
export async function hashForOpenAiBrowser(
  kind: OpenAiHashKind,
  value: Input,
): Promise<string | undefined> {
  const normalized = normalizeForOpenAi(kind, value);
  if (normalized === undefined || !globalThis.crypto?.subtle) return undefined;
  return sha256HexBrowser(normalized);
}

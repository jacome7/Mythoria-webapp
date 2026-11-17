/**
 * Server-only SHA-256 hashing for OpenAI Ads identifiers (node:crypto).
 * Never import this file from client components; use `hashForOpenAiBrowser` from `./hashing`.
 */
import { createHash } from 'node:crypto';
import { normalizeForOpenAi, type OpenAiHashKind } from './hashing';

/** SHA-256 of the UTF-8 bytes as 64-char lowercase hex. */
export function sha256HexNode(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Normalizes then hashes. Returns `undefined` when the value is missing or invalid. */
export function hashForOpenAi(
  kind: OpenAiHashKind,
  value: string | null | undefined,
): string | undefined {
  const normalized = normalizeForOpenAi(kind, value);
  return normalized === undefined ? undefined : sha256HexNode(normalized);
}

import { createHash } from 'node:crypto';
export function joinEvidence(entries: readonly string[]) {
  return entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function chunkEvidence(entries: readonly string[]) {
  const chunks: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const raw of entries) {
    const entry = raw.trim();
    if (!entry) continue;
    if (size + entry.length > 50_000 || current.length >= 500) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += entry.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

// Derive a stable UUID from the exact input. A changed transcript, reset interview,
// or changed Step 2 input creates a new identity. Lost responses can reuse it.
export function whispererUuid(namespace: string, input: unknown): string {
  const bytes = createHash('sha256')
    .update(namespace)
    .update('\0')
    .update(JSON.stringify(input))
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

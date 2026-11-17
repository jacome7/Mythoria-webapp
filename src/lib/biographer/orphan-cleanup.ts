/** Return the project ID only for well-formed private media paths older than the grace period. */
export function orphanCandidate(
  name: string,
  created: string | undefined,
  now: Date,
): string | null {
  const match =
    /^biographer\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/(?:photos\/[0-9a-f-]{36}|[0-9a-f-]{36}\/\d+-[0-9a-f-]{36})$/i.exec(
      name,
    );
  if (!match || !created) return null;
  const timestamp = Date.parse(created);
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() - 24 * 60 * 60 * 1000) return null;
  return match[1] ?? null;
}

export function shouldDeleteOrphan(
  name: string,
  created: string | undefined,
  now: Date,
  referencedBy: { asset: boolean; segment: boolean },
): boolean {
  return (
    Boolean(orphanCandidate(name, created, now)) && !referencedBy.asset && !referencedBy.segment
  );
}

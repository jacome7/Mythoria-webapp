export function getRenderableBlogImageUrl(value: string | null | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

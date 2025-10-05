// Simple MDX security validator (admin-only editing; minimal checks)
// Reject obvious import/export and dynamic import() usage.

const forbiddenPatterns = [
  /(^|\n)\s*import\b/, // static import
  /(^|\n)\s*export\b/, // export statements
  /import\s*\(/, // dynamic import
];

export function validateMdxSource(src: string): { ok: true } | { ok: false; reason: string } {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(src)) {
      return { ok: false, reason: `Forbidden MDX construct matched pattern: ${pattern}` };
    }
  }
  return { ok: true };
}

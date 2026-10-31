import { createHash } from 'node:crypto';
import type { SurveyDefinition } from './definition-schema';

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => (item === undefined ? null : sortValue(item)));
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] !== undefined) sorted[key] = sortValue(source[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Deterministic JSON: object keys are sorted recursively, arrays keep their order and
 * `undefined` object members are dropped (matching `JSON.stringify`).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

/** sha256 (hex) of the canonical JSON of a survey definition. */
export function hashSurveyDefinition(definition: SurveyDefinition): string {
  return createHash('sha256').update(canonicalJson(definition)).digest('hex');
}

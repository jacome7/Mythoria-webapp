import { canonicalJson, hashSurveyDefinition } from './definition-hash';
import type { SurveyDefinition } from './definition-schema';

describe('canonicalJson', () => {
  it('sorts object keys recursively', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[{"y":2,"z":1}],"d":2},"b":1}',
    );
  });

  it('keeps array order and drops undefined members', () => {
    expect(canonicalJson({ list: [3, 1, 2], skip: undefined, keep: null })).toBe(
      '{"keep":null,"list":[3,1,2]}',
    );
  });

  it('is independent of key insertion order', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
  });
});

describe('hashSurveyDefinition', () => {
  const base = {
    schemaVersion: 1,
    id: 'demo',
    version: 1,
    questions: [{ id: 'q1', type: 'static_content' }],
  } as unknown as SurveyDefinition;

  it('returns a 64 char sha256 hex digest', () => {
    expect(hashSurveyDefinition(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across key order and changes with content', () => {
    const reordered = {
      questions: [{ type: 'static_content', id: 'q1' }],
      version: 1,
      id: 'demo',
      schemaVersion: 1,
    } as unknown as SurveyDefinition;
    expect(hashSurveyDefinition(reordered)).toBe(hashSurveyDefinition(base));
    expect(hashSurveyDefinition({ ...base, version: 2 })).not.toBe(hashSurveyDefinition(base));
  });
});

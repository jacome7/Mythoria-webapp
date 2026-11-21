import { z } from 'zod';
import { chunkEvidence, joinEvidence, whispererUuid } from './seed';

describe('Story Whisperer evidence', () => {
  it('preserves individual contributions and their order', () => {
    const entries = [' Earlier note. ', '', ' First story event. ', 'Name confirmed in a caption.'];
    expect(joinEvidence(entries)).toBe(
      'Earlier note.\n\nFirst story event.\n\nName confirmed in a caption.',
    );
  });

  it('keeps all oversized evidence across bounded SGW batches', () => {
    const entries = ['a'.repeat(40000), 'b'.repeat(16000), 'c'.repeat(40000), 'Last detail.'];
    const chunks = chunkEvidence(entries);
    expect(chunks.flat()).toEqual(entries);
    expect(chunks.every((chunk) => joinEvidence(chunk).length <= 60000)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('reuses a valid request UUID for identical inputs and separates changes and retries', () => {
    const input = ['author', 'story', 'project', { revision: 2, brief: 'The swimming lesson' }];
    const first = whispererUuid('whisperer-structure', input);
    expect(z.uuid().safeParse(first).success).toBe(true);
    expect(whispererUuid('whisperer-structure', input)).toBe(first);
    expect(whispererUuid('whisperer-structure', [...input, { retryOf: first }])).not.toBe(first);
    expect(whispererUuid('whisperer-question', input)).not.toBe(first);
  });
});

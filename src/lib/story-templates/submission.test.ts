import { webcrypto } from 'node:crypto';
import {
  originalAudioPath,
  readStep2Submission,
  saveStep2Submission,
  storyInputFingerprint,
  type Step2Submission,
} from './submission';

const submission: Step2Submission = {
  owner: 'owner-one',
  storyId: '106f5eb8-563d-45e3-8d07-75fc03e19517',
  fingerprint: 'input-fingerprint',
  completed: false,
  structureRequestId: '9b493ae6-576f-4efb-88a1-448d933fa58b',
  structurePayload: '{"accepted":"input"}',
};

beforeAll(() => {
  if (!crypto.subtle)
    Object.defineProperty(crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
});
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe('step 2 submission persistence', () => {
  it('restores the exact retry identity and payload only for the owning author', () => {
    saveStep2Submission(submission);
    expect(readStep2Submission('owner-one')).toEqual({ ...submission, workflow: 'standard' });
    expect(readStep2Submission('owner-two')).toBeNull();
  });

  it('isolates paused experimental submissions from new standard stories', () => {
    saveStep2Submission(submission, true);
    expect(readStep2Submission('owner-one')).toBeNull();
    const standard = { ...submission, storyId: '95285240-52ec-4918-aac9-52bbb6575727' };
    saveStep2Submission(standard);
    expect(readStep2Submission('owner-one')?.storyId).toBe(standard.storyId);
    expect(readStep2Submission('owner-one', true)?.storyId).toBe(submission.storyId);
    expect(readStep2Submission('owner-two', true)).toBeNull();
  });

  it('preserves an older template retry before starting the standard workflow', () => {
    sessionStorage.setItem('step2Submission', JSON.stringify(submission));
    expect(readStep2Submission('owner-one')).toBeNull();
    expect(readStep2Submission('owner-one', true)).toEqual({
      ...submission,
      workflow: 'experimental',
    });
  });

  it.each([
    'not JSON',
    JSON.stringify({ ...submission, storyId: 'not-a-uuid' }),
    JSON.stringify({ ...submission, structureRequestId: 'invalid' }),
    JSON.stringify({ ...submission, completed: 'yes' }),
    JSON.stringify({ ...submission, structurePayload: 'x'.repeat(60_001) }),
  ])('ignores corrupt or incompatible saved state %#', (raw) => {
    sessionStorage.setItem('step2Submission', raw);
    expect(readStep2Submission('owner-one')).toBeNull();
  });

  it('handles denied storage reads without returning another author’s state', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStep2Submission('owner-one')).toBeNull();
  });

  it('does not silently claim persistence when storage cannot retain the retry identity', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => saveStep2Submission(submission)).toThrow('full');
  });

  it('fingerprints deterministically and detects changed accepted inputs without exposing them', async () => {
    const value = { brief: 'A private memory', characters: ['character-a'], locale: 'en-US' };
    const first = await storyInputFingerprint(value);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(await storyInputFingerprint(value)).toBe(first);
    expect(await storyInputFingerprint({ ...value, brief: 'A changed memory' })).not.toBe(first);
    expect(await storyInputFingerprint({ ...value, locale: 'pt-PT' })).not.toBe(first);
    expect(first).not.toContain('private');
  });

  it('normalizes relocated audio to its original contribution identity', () => {
    localStorage.setItem(
      'step2RelocatedInputs',
      JSON.stringify({ storyId: submission.storyId, audioPath: 'pending/session/voice.webm' }),
    );
    expect(originalAudioPath(`${submission.storyId}/inputs/voice.webm`)).toBe(
      'pending/session/voice.webm',
    );
    expect(originalAudioPath('new-recording/voice.webm')).toBe('new-recording/voice.webm');
    expect(originalAudioPath('different-story/inputs/voice.webm')).toBe(
      'different-story/inputs/voice.webm',
    );
    expect(originalAudioPath(undefined)).toBeUndefined();
  });

  it('ignores damaged audio relocation metadata', () => {
    localStorage.setItem('step2RelocatedInputs', '{bad');
    expect(originalAudioPath('original/path.webm')).toBe('original/path.webm');
  });
});

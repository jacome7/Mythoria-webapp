import { concatenate, fromBase64, toBase64, wav } from './audio';

describe('biographer audio archival', () => {
  it('reassembles independently stored chunks without losing sequence boundaries', () => {
    const input = [new Uint8Array([1, 2]).buffer, new Uint8Array([3, 4, 5]).buffer];
    expect([...new Uint8Array(concatenate(input))]).toEqual([1, 2, 3, 4, 5]);
    expect(concatenate([]).byteLength).toBe(0);
  });
  it('roundtrips binary samples through JSON transport', () => {
    const input = new Uint8Array([0, 255, 128, 13]).buffer;
    expect([...fromBase64(toBase64(input))]).toEqual([0, 255, 128, 13]);
  });
  it('creates a WAV archive with the complete PCM payload', () => {
    const pcm = new ArrayBuffer(32000);
    const result = wav(pcm);
    expect(result.type).toBe('audio/wav');
    expect(result.size).toBe(pcm.byteLength + 44);
  });
});

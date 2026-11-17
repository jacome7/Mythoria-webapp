import { concatenate, fromBase64, pcm16, toBase64, wav } from './audio';

describe('biographer audio archival', () => {
  it('encodes signed little-endian PCM without wrapping clipped samples', () => {
    const result = pcm16(new Float32Array([-2, -1, 0, 1, 2]), 16000);
    const view = new DataView(result);
    expect(Array.from({ length: 5 }, (_, i) => view.getInt16(i * 2, true))).toEqual([
      -32768, -32768, 0, 32767, 32767,
    ]);
  });
  it('downsamples 48k and 44.1k capture to the 16k provider format', () => {
    for (const rate of [48000, 44100]) {
      const result = pcm16(new Float32Array(rate).fill(0.5), rate);
      expect(result.byteLength).toBe(32000);
      expect(new DataView(result).getInt16(100, true)).toBe(16383);
    }
  });
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
    const pcm = pcm16(new Float32Array(16000), 16000);
    const result = wav(pcm);
    expect(result.type).toBe('audio/wav');
    expect(result.size).toBe(pcm.byteLength + 44);
  });
  it('rejects invalid capture sample rates', () => {
    expect(() => pcm16(new Float32Array(10), 8000)).toThrow();
  });
});

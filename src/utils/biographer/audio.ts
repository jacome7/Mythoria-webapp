/** Downsample captured PCM and encode exactly the signed 16-bit format Gemini accepts. */
export function pcm16(input: Float32Array, inputRate: number, outputRate = 16000): ArrayBuffer {
  if (inputRate < outputRate || outputRate <= 0) throw new Error('Unsupported sample rate');
  const ratio = inputRate / outputRate;
  const output = new ArrayBuffer(Math.floor(input.length / ratio) * 2);
  const view = new DataView(output);
  for (let i = 0; i < view.byteLength / 2; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let total = 0;
    for (let j = start; j < end; j++) total += input[j];
    const value = Math.max(-1, Math.min(1, total / Math.max(1, end - start)));
    view.setInt16(i * 2, value < 0 ? value * 32768 : value * 32767, true);
  }
  return output;
}

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let value = '';
  for (let i = 0; i < bytes.length; i++) value += String.fromCharCode(bytes[i]);
  return btoa(value);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function concatenate(buffers: ArrayBuffer[]): ArrayBuffer {
  const result = new Uint8Array(buffers.reduce((size, buffer) => size + buffer.byteLength, 0));
  let offset = 0;
  for (const buffer of buffers) {
    result.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return result.buffer;
}

export function wav(pcm: ArrayBuffer, rate = 16000): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const label = (offset: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  label(0, 'RIFF');
  view.setUint32(4, pcm.byteLength + 36, true);
  label(8, 'WAVE');
  label(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  label(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

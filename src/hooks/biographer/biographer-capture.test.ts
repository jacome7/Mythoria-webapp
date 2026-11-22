import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { join } from 'node:path';

describe('biographer audio worklet', () => {
  it.each([16000, 44100, 48000])('emits 40ms of signed mono PCM at %i Hz', (rate) => {
    let Processor: new () => { process: (inputs: Float32Array[][]) => boolean };
    const messages: ArrayBuffer[] = [];
    class Base {
      port = { postMessage: (data: ArrayBuffer) => messages.push(data) };
    }
    runInNewContext(
      readFileSync(join(process.cwd(), 'public/audio/biographer-capture.js'), 'utf8'),
      {
        AudioWorkletProcessor: Base,
        sampleRate: rate,
        registerProcessor: (_name: string, processor: typeof Processor) => {
          Processor = processor;
        },
        ArrayBuffer,
        DataView,
        Float32Array,
        Math,
      },
    );
    const processor = new Processor!();
    const input = new Float32Array(rate / 25).fill(0.5);
    input.fill(-2, 0, 16);
    input.fill(2, input.length - 16);
    for (let i = 0; i < input.length; i += 128) {
      processor.process([[input.subarray(i, i + 128)]]);
    }
    expect(messages).toHaveLength(1);
    expect(messages[0].byteLength).toBe(1280);
    const pcm = new DataView(messages[0]);
    expect(pcm.getInt16(0, true)).toBe(-32768);
    expect(pcm.getInt16(640, true)).toBe(16383);
    expect(pcm.getInt16(1278, true)).toBe(32767);
  });
});

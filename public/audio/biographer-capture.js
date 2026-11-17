/* Runs on the audio rendering thread. Output is silent; microphone data never reaches speakers. */
class BiographerCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    if (sampleRate < 16000) throw new Error('Unsupported sample rate');
    this.samples = new Float32Array(Math.round(sampleRate / 25));
    this.offset = 0;
  }

  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.samples[this.offset++] = sample;
      if (this.offset === this.samples.length) {
        const length = 640;
        const pcm = new ArrayBuffer(length * 2);
        const view = new DataView(pcm);
        const ratio = sampleRate / 16000;
        for (let i = 0; i < length; i++) {
          const start = Math.floor(i * ratio);
          const end = Math.floor((i + 1) * ratio);
          let total = 0;
          for (let j = start; j < end; j++) total += this.samples[j];
          const value = Math.max(-1, Math.min(1, total / Math.max(1, end - start)));
          view.setInt16(i * 2, value < 0 ? value * 32768 : value * 32767, true);
        }
        this.port.postMessage(pcm, [pcm]);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('biographer-capture', BiographerCapture);

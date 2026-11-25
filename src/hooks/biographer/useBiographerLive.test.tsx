import { act, renderHook, waitFor } from '@testing-library/react';
import { useBiographerLive } from './useBiographerLive';
import { clearPending, pendingSegments, savePending } from '@/utils/biographer/pending';

jest.mock('@/utils/biographer/pending', () => ({
  clearPending: jest.fn().mockResolvedValue(undefined),
  pendingSegments: jest.fn().mockResolvedValue([{ id: 'unexpired' }]),
  savePending: jest.fn(),
}));

class TestLiveSocket {
  static OPEN = 1;
  static current: TestLiveSocket;
  readyState = TestLiveSocket.OPEN;
  onmessage?: (event: { data: string }) => void;
  onclose?: (event: { code: number; wasClean: boolean }) => void;
  send = jest.fn();
  close = jest.fn();

  constructor(_url: string) {
    TestLiveSocket.current = this;
  }

  ready() {
    this.onmessage?.({ data: JSON.stringify({ type: 'ready' }) });
  }
}

const liveSession = {
  ok: true,
  json: async () => ({ sessionId: 'session', ticket: 'ticket', liveUrl: 'wss://example.test' }),
};

describe('live voice capture', () => {
  const originalWorklet = globalThis.AudioWorkletNode;
  const originalSocket = globalThis.WebSocket;
  const originalContext = globalThis.AudioContext;
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue(liveSession);
  });
  afterEach(() => {
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: originalSocket });
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: originalContext,
    });
    Object.defineProperty(globalThis, 'AudioWorkletNode', {
      configurable: true,
      value: originalWorklet,
    });
  });

  it('leaves unexpired legacy recordings until explicit reset without uploading them', async () => {
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await waitFor(() => expect(pendingSegments).toHaveBeenCalledWith('author', 'project'));
    expect(clearPending).not.toHaveBeenCalled();
    await act(async () => result.current.reset());
    expect(clearPending).toHaveBeenCalledWith('author', 'project');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(savePending).not.toHaveBeenCalled();
  });
  it('plays queued voice samples and stops them immediately on interruption', async () => {
    const stop = jest.fn();
    const microphoneStop = jest.fn();
    const getUserMedia = jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: microphoneStop }],
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const samples = new Float32Array(1);
    const createBuffer = jest.fn(() => ({
      duration: 1 / 24000,
      getChannelData: () => samples,
    }));
    const start = jest.fn();
    class Context {
      state = 'running';
      currentTime = 10;
      destination = {};
      audioWorklet = { addModule: jest.fn().mockResolvedValue(undefined) };
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createBuffer = createBuffer;
      createBufferSource = jest.fn(() => ({ start, stop, connect: jest.fn() }));
    }
    class Socket {
      static OPEN = 1;
      readyState = 1;
      onmessage?: (event: { data: string }) => void;
      send = jest.fn();
      close = jest.fn();
      constructor(_url: string) {
        socket = this;
      }
    }
    let socket: Socket;
    const oldSocket = globalThis.WebSocket;
    const oldContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sessionId: 'session', ticket: 'ticket', liveUrl: 'wss://example.test' }),
    });
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.start();
    });
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
    const data = JSON.stringify({ type: 'media', mimeType: 'audio/pcm;rate=24000', data: 'AIA=' });
    act(() => {
      socket.onmessage?.({ data });
      socket.onmessage?.({ data });
    });
    expect(createBuffer).toHaveBeenCalledWith(1, 1, 24000);
    expect(samples[0]).toBe(-1);
    expect(start.mock.calls).toEqual([[10], [10 + 1 / 24000]]);
    expect(result.current.state).toBe('speaking');
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'interrupted' }) }));
    expect(stop).toHaveBeenCalledTimes(2);
    expect(result.current.state).toBe('listening');
    expect(microphoneStop).not.toHaveBeenCalled();
    unmount();
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: oldSocket });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: oldContext });
  });
  it('sends audio only over the socket, freezes capture during outline preparation, and handles cancelled calls', async () => {
    const stop = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    const processor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      port: { onmessage: (_event: { data: ArrayBuffer }) => {} },
    };
    class Context {
      destination = {};
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createMediaStreamSource() {
        return { connect: jest.fn(), disconnect: jest.fn() };
      }
      audioWorklet = { addModule: jest.fn().mockResolvedValue(undefined) };
    }
    const originalContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioWorkletNode', {
      configurable: true,
      value: jest.fn(() => processor),
    });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: TestLiveSocket });
    global.fetch = jest.fn().mockResolvedValue(liveSession);
    const onEvent = jest.fn();
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', onEvent));
    try {
      await act(async () => result.current.start());
      const socket = TestLiveSocket.current;
      const emit = (event: object) => socket.onmessage?.({ data: JSON.stringify(event) });
      act(() => {
        socket.ready();
        for (let offset = 0; offset < 25; offset++)
          processor.port.onmessage({ data: new ArrayBuffer(1280) });
      });
      expect(savePending).not.toHaveBeenCalled();
      const audio = new ArrayBuffer(1280);
      new Int16Array(audio).fill(64);
      act(() => {
        processor.port.onmessage({ data: audio });
        emit({ type: 'advance_to_outline', callId: 'call', turnId: 'final-answer' });
      });
      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'advance_to_outline', callId: 'call' }),
      );

      jest.useFakeTimers();
      const consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);
      const environment = jest.replaceProperty(process.env, 'NODE_ENV', 'development');
      try {
        await act(async () => {
          const prepared = jest.fn();
          const preparation = result.current.prepareOutline().then(prepared);
          const outbound = JSON.parse(socket.send.mock.calls.at(-1)?.[0]);
          expect(outbound).toMatchObject({
            type: 'prepare_outline',
            requestId: expect.any(String),
          });
          processor.port.onmessage({ data: new ArrayBuffer(64) });
          expect(socket.send).toHaveBeenCalledTimes(27);
          emit({ type: 'outline_prepared', requestId: 'unrelated' });
          jest.advanceTimersByTime(9_200);
          await Promise.resolve();
          expect(prepared).not.toHaveBeenCalled();
          emit({ type: 'outline_prepared', requestId: outbound.requestId });
          await preparation;
          expect(prepared).toHaveBeenCalledWith(true);
          expect(consoleInfo).toHaveBeenCalledWith(
            '[Biographer live]',
            'outline-preparation-confirmed',
            { elapsedMs: 9_200 },
          );
        });

        await act(async () => {
          result.current.resumeCapture();
          const preparation = result.current.prepareOutline();
          jest.advanceTimersByTime(20_000);
          await expect(preparation).resolves.toBe(false);
          expect(consoleInfo).toHaveBeenCalledWith(
            '[Biographer live]',
            'outline-preparation-timeout',
            { timeoutMs: 20_000, elapsedMs: 20_000 },
          );
        });
      } finally {
        environment.restore();
        consoleInfo.mockRestore();
        jest.useRealTimers();
      }
      expect(savePending).not.toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();

      act(() => {
        emit({ type: 'advance_to_outline_cancelled', callId: 'call' });
        expect(result.current.finishOutline('call', true)).toBe(false);
        result.current.resumeCapture();
        processor.port.onmessage({ data: new ArrayBuffer(64) });
      });
      expect(JSON.parse(socket.send.mock.calls.at(-2)?.[0])).toEqual({ type: 'resume_outline' });
      const { turnId } = JSON.parse(socket.send.mock.calls.at(-1)?.[0]);
      act(() => {
        emit({ type: 'speech_detected', turnId });
        emit({ type: 'capture_boundary', turnId, nextTurnId: 'next-turn' });
        processor.port.onmessage({ data: new ArrayBuffer(64) });
        emit({ type: 'transcript', role: 'user', turnId, text: 'Saved answer', final: true });
        emit({ type: 'speech_detected', turnId: 'next-turn' });
        socket.readyState = 3;
        socket.onclose?.({ code: 1006, wasClean: false });
      });
      expect(JSON.parse(socket.send.mock.calls.at(-1)?.[0])).toMatchObject({
        type: 'audio',
        turnId: 'next-turn',
      });
      expect(onEvent).toHaveBeenLastCalledWith({
        type: 'disconnected',
        sessionId: 'session',
        unfinishedSpeechIds: ['next-turn'],
      });
      expect(stop).toHaveBeenCalledTimes(1);
      expect(result.current.state).toBe('paused');
    } finally {
      unmount();
      Object.defineProperty(globalThis, 'AudioContext', {
        configurable: true,
        value: originalContext,
      });
    }
  });
  it('pauses on backgrounding and does not automatically restart on return', async () => {
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state).toBe('paused');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state).toBe('paused');
  });
});

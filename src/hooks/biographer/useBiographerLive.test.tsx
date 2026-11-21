import { act, renderHook, waitFor } from '@testing-library/react';
import { useBiographerLive } from './useBiographerLive';
import {
  clearPending,
  pendingSegments,
  removePending,
  savePending,
} from '@/utils/biographer/pending';

jest.mock('@/utils/biographer/pending', () => ({
  clearPending: jest.fn(),
  pendingSegments: jest.fn(),
  removePending: jest.fn(),
  savePending: jest.fn(),
}));
const pending = pendingSegments as jest.Mock;
const removed = removePending as jest.Mock;

class TestLiveSocket {
  static OPEN = 1;
  static current: TestLiveSocket;
  readyState = TestLiveSocket.OPEN;
  onmessage?: (event: { data: string }) => void;
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

const segment = {
  id: 'segment-1',
  authorId: 'author',
  projectId: 'project',
  sessionId: 'session',
  turnId: 'turn',
  sequence: 2,
  durationMs: 10,
  capturedAt: new Date().toISOString(),
  data: new Uint8Array([1, 2]).buffer,
};

describe('live archival recovery', () => {
  const originalWorklet = globalThis.AudioWorkletNode;
  const originalSocket = globalThis.WebSocket;
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis.crypto, 'subtle', {
      configurable: true,
      value: { digest: jest.fn().mockResolvedValue(new Uint8Array([0xab]).buffer) },
    });
    pending.mockResolvedValue([segment]);
  });
  afterEach(() => {
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: originalSocket });
    Object.defineProperty(globalThis, 'AudioWorkletNode', {
      configurable: true,
      value: originalWorklet,
    });
  });
  it('keeps text-only work available when the microphone recovery database is unavailable', async () => {
    pending.mockRejectedValue(new Error('IndexedDB unavailable'));
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => result.current.sync());
    expect(result.current.saving).toBe('saved');
    expect(result.current.error).toBe(false);
  });
  it('retains local audio when the server acknowledgement does not identify the saved bytes', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ saved: true, id: segment.id, sequence: 2, sha256: 'wrong' }),
    });
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await waitFor(() => expect(result.current.saving).toBe('attention'));
    expect(removed).not.toHaveBeenCalled();
  });
  it('removes local audio only after verifying the server acknowledgement', async () => {
    pending.mockResolvedValueOnce([segment]).mockResolvedValue([]);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ saved: true, id: segment.id, sequence: 2, sha256: 'ab' }),
    });
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await waitFor(() => expect(removed).toHaveBeenCalledWith(segment.id));
    await waitFor(() => expect(result.current.saving).toBe('saved'));
  });
  it('never removes an archived segment if the guest cookie belongs to a different participant', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'This contribution session changed. Reopen your personal return link.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn(), true));
    await waitFor(() => expect(result.current.saving).toBe('attention'));
    expect(result.current.error).toBe(true);
    expect(removed).not.toHaveBeenCalled();
    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).get('x-biographer-project')).toBe('project');
    expect(new Headers(request.headers).get('x-biographer-participant')).toBe('author');
  });
  it('plays queued voice samples and stops them immediately on interruption', async () => {
    pending.mockResolvedValue([]);
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
  it('clears the current author and project recovery queue on explicit reset', async () => {
    pending.mockResolvedValue([]);
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => result.current.reset());
    expect(clearPending).toHaveBeenCalledWith('author', 'project');
    expect(result.current.saving).toBe('saved');
  });
  it('starts audio sequence numbers at zero for each completed live answer', async () => {
    pending.mockResolvedValue([]);
    (savePending as jest.Mock).mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    let uuid = 0;
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}`,
    });
    const processor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      port: { onmessage: (_event: { data: ArrayBuffer }) => {} },
    };
    class Context {
      sampleRate = 16000;
      destination = {};
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createMediaStreamSource() {
        return { connect: jest.fn(), disconnect: jest.fn() };
      }
      audioWorklet = { addModule: jest.fn().mockResolvedValue(undefined) };
    }
    class Socket {
      static OPEN = 1;
      readyState = 1;
      onmessage?: (event: { data: string }) => void;
      onopen?: () => void;
      onclose?: () => void;
      onerror?: () => void;
      send = jest.fn();
      close = jest.fn();
      constructor(_url: string) {
        socket = this;
      }
    }
    let socket: Socket;
    const oldSocket = globalThis.WebSocket;
    const oldContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioWorkletNode', {
      configurable: true,
      value: jest.fn(() => processor),
    });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: Socket });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        sessionId: 'session',
        ticket: 'ticket',
        liveUrl: 'wss://example.test',
      }),
    });
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.start();
    });
    act(() => socket.onmessage?.({ data: JSON.stringify({ type: 'ready' }) }));
    act(() => processor.port.onmessage({ data: new ArrayBuffer(32000) }));
    await waitFor(() => expect(savePending).toHaveBeenCalledTimes(1));
    const first = (savePending as jest.Mock).mock.calls[0][0];
    act(() =>
      socket.onmessage?.({ data: JSON.stringify({ type: 'turn_complete', turnId: first.turnId }) }),
    );
    act(() => processor.port.onmessage({ data: new ArrayBuffer(32000) }));
    await waitFor(() => expect(savePending).toHaveBeenCalledTimes(2));
    const second = (savePending as jest.Mock).mock.calls[1][0];
    expect(first.sequence).toBe(0);
    expect(second.sequence).toBe(0);
    expect(second.turnId).not.toBe(first.turnId);
    unmount();
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: oldSocket });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: oldContext });
  });
  it('journals captured audio after the connection drops and stops the microphone on pause', async () => {
    pending.mockResolvedValue([]);
    (savePending as jest.Mock).mockResolvedValue(undefined);
    const stop = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const processor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      port: { onmessage: (_event: { data: ArrayBuffer }) => {} },
    };
    class Context {
      sampleRate = 16000;
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
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(liveSession)
      .mockRejectedValue(new Error('offline'));
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.start();
    });
    act(() => TestLiveSocket.current.ready());
    expect(result.current.state).toBe('listening');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => processor.port.onmessage({ data: new ArrayBuffer(32000) }));
    await waitFor(() =>
      expect(savePending).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'author', projectId: 'project', durationMs: 1000 }),
      ),
    );
    act(() => result.current.pause());
    expect(stop).toHaveBeenCalled();
    expect(result.current.state).toBe('paused');
    unmount();
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: originalContext,
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
  it('retains unsaved audio and never reports saved when local storage is full', async () => {
    pending.mockResolvedValue([]);
    (savePending as jest.Mock).mockRejectedValue(new Error('quota exceeded'));
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }),
      },
    });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const processor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      port: { onmessage: (_event: { data: ArrayBuffer }) => {} },
    };
    class Context {
      sampleRate = 16000;
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
    global.fetch = jest.fn().mockResolvedValueOnce(liveSession);
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.start();
    });
    act(() => TestLiveSocket.current.ready());
    act(() => processor.port.onmessage({ data: new ArrayBuffer(32000) }));
    await waitFor(() => expect(result.current.saving).toBe('attention'));
    await act(async () => {
      await result.current.sync();
    });
    expect(result.current.saving).toBe('attention');
    expect((savePending as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(removed).not.toHaveBeenCalled();
    let existing = true;
    pending.mockImplementation(async () => (existing ? [segment] : []));
    removed.mockImplementation(async (id: string) => {
      if (id === segment.id) existing = false;
    });
    (savePending as jest.Mock).mockImplementation(async () => {
      if (existing) throw new Error('quota exceeded');
    });
    global.fetch = jest.fn(async (_url, init) => {
      const payload = JSON.parse(String(init?.body));
      return {
        ok: true,
        json: async () => ({
          saved: true,
          id: payload.id,
          sequence: payload.sequence,
          sha256: payload.sha256,
        }),
      } as Response;
    }) as jest.Mock;
    await act(async () => {
      await result.current.sync();
    });
    expect(removed).toHaveBeenCalledWith(segment.id);
    expect(result.current.saving).toBe('saved');
    unmount();
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: originalContext,
    });
  });
  it('pauses on backgrounding and does not automatically restart on return', async () => {
    pending.mockResolvedValue([]);
    const { result } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state).toBe('paused');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.state).toBe('paused');
  });
});

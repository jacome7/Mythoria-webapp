import { act, renderHook, waitFor } from '@testing-library/react';
import { useBiographerLive } from './useBiographerLive';
import { pendingSegments, removePending, savePending } from '@/utils/biographer/pending';

jest.mock('@/utils/biographer/pending', () => ({
  pendingSegments: jest.fn(),
  removePending: jest.fn(),
  savePending: jest.fn(),
}));
const pending = pendingSegments as jest.Mock;
const removed = removePending as jest.Mock;
const segment = {
  id: 'segment-1',
  authorId: 'author',
  projectId: 'project',
  sessionId: 'session',
  turnId: 'turn',
  sequence: 2,
  durationMs: 10,
  data: new Uint8Array([1, 2]).buffer,
};

describe('live archival recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(globalThis.crypto, 'subtle', {
      configurable: true,
      value: { digest: jest.fn().mockResolvedValue(new Uint8Array([0xab]).buffer) },
    });
    pending.mockResolvedValue([segment]);
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
  it('stops the microphone when avatar video playback is unsupported', async () => {
    pending.mockResolvedValue([]);
    const stop = jest.fn();
    const stream = { getTracks: () => [{ stop }] };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue(stream) },
    });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    class MockAudioContext {
      state = 'running';
      sampleRate = 48000;
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
    }
    class MockSocket {
      static OPEN = 1;
      readyState = 1;
      onopen?: () => void;
      onmessage?: (event: { data: string }) => void;
      onerror?: () => void;
      onclose?: () => void;
      send = jest.fn();
      close = jest.fn();
      constructor(_url: string) {
        socket = this;
      }
    }
    let socket: MockSocket;
    const oldSocket = globalThis.WebSocket;
    const oldContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
    });
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: MockSocket });
    Object.defineProperty(globalThis, 'MediaSource', { configurable: true, value: undefined });
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
    act(() =>
      socket.onmessage?.({
        data: JSON.stringify({ type: 'media', mimeType: 'video/mp4', data: 'AA==' }),
      }),
    );
    expect(result.current.state).toBe('paused');
    expect(result.current.error).toBe(true);
    expect(stop).toHaveBeenCalled();
    unmount();
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: oldSocket });
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: oldContext });
  });
  it('journals an offline recording before attempting upload and stops capture on pause', async () => {
    pending.mockResolvedValue([]);
    (savePending as jest.Mock).mockResolvedValue(undefined);
    const stop = jest.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) },
    });
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(globalThis.crypto, 'randomUUID', {
      configurable: true,
      value: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    const processor = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: (_event: unknown) => {},
    };
    class Context {
      sampleRate = 16000;
      destination = {};
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createMediaStreamSource() {
        return { connect: jest.fn(), disconnect: jest.fn() };
      }
      createScriptProcessor() {
        return processor;
      }
    }
    const originalContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.startLocalRecording();
    });
    expect(result.current.state).toBe('recording');
    act(() =>
      processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(16000) } }),
    );
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
      onaudioprocess: (_event: unknown) => {},
    };
    class Context {
      sampleRate = 16000;
      destination = {};
      resume = jest.fn().mockResolvedValue(undefined);
      close = jest.fn().mockResolvedValue(undefined);
      createMediaStreamSource() {
        return { connect: jest.fn(), disconnect: jest.fn() };
      }
      createScriptProcessor() {
        return processor;
      }
    }
    const originalContext = globalThis.AudioContext;
    Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: Context });
    const { result, unmount } = renderHook(() => useBiographerLive('project', 'author', jest.fn()));
    await act(async () => {
      await result.current.startLocalRecording();
    });
    act(() =>
      processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(16000) } }),
    );
    await waitFor(() => expect(result.current.saving).toBe('attention'));
    await act(async () => {
      await result.current.sync();
    });
    expect(result.current.saving).toBe('attention');
    expect((savePending as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(removed).not.toHaveBeenCalled();
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

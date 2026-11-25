'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fromBase64, toBase64 } from '@/utils/biographer/audio';
import { clearPending, pendingSegments } from '@/utils/biographer/pending';

function liveDiagnostic(event: string, details?: Record<string, number | string | boolean>) {
  if (process.env.NODE_ENV === 'development') console.info('[Biographer live]', event, details);
}

const finalTranscriptTimeoutMs = 20_000;

export type LiveState = 'paused' | 'connecting' | 'listening' | 'speaking' | 'reconnecting';
export interface LiveEvent {
  type: string;
  role?: 'user' | 'assistant';
  turnId?: string;
  nextTurnId?: string;
  callId?: string;
  requestId?: string;
  text?: string;
  final?: boolean;
  interrupted?: boolean;
  mimeType?: string;
  data?: string;
  code?: string;
  remainingSeconds?: number;
  sessionId?: string;
  unfinishedSpeechIds?: string[];
}

export function useBiographerLive(
  projectId: string,
  authorId: string,
  onEvent: (event: LiveEvent) => void,
) {
  const basePath = `/api/biographer/projects/${projectId}`;
  const [state, setState] = useState<LiveState>('paused');
  const [error, setError] = useState(false);
  const eventRef = useRef(onEvent);
  eventRef.current = onEvent;
  const resources = useRef<{
    socket?: WebSocket;
    stream?: MediaStream;
    context?: AudioContext;
    processor?: AudioWorkletNode;
    source?: MediaStreamAudioSourceNode;
    sessionId?: string;
  }>({});
  const turn = useRef('');
  const unfinishedSpeech = useRef(new Set<string>());
  const epoch = useRef(0);
  const playback = useRef<{
    context?: AudioContext;
    next: number;
    sources: AudioBufferSourceNode[];
  }>({ next: 0, sources: [] });
  const advanceCalls = useRef(new Set<string>());
  const captureFrozen = useRef(false);
  const outlinePreparation = useRef<
    | {
        id: string;
        complete: (prepared: boolean) => void;
      }
    | undefined
  >(undefined);

  const stopPlayback = useCallback(() => {
    playback.current.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        /* Already stopped. */
      }
    });
    playback.current.sources = [];
    playback.current.next = 0;
  }, []);

  const pause = useCallback(
    (discard = false) => {
      epoch.current += 1;
      advanceCalls.current.clear();
      outlinePreparation.current?.complete(false);
      captureFrozen.current = false;
      unfinishedSpeech.current.clear();
      const current = resources.current;
      resources.current = {};
      current.processor?.disconnect();
      current.source?.disconnect();
      current.stream?.getTracks().forEach((track) => track.stop());
      if (current.context) void current.context.close();
      if (current.socket?.readyState === WebSocket.OPEN)
        current.socket.send(JSON.stringify({ type: discard ? 'cancel' : 'pause' }));
      current.socket?.close();
      stopPlayback();
      setState('paused');
    },
    [stopPlayback],
  );

  const discardSession = useCallback(
    async (sessionId: string, turnId?: string) => {
      const response = await fetch(`${basePath}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnId }),
        keepalive: true,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error('Unable to discard unfinished voice');
    },
    [basePath],
  );

  const disconnect = useCallback(() => {
    const { sessionId, processor } = resources.current;
    const unfinishedSpeechIds = [...unfinishedSpeech.current];
    pause();
    if (sessionId && processor) {
      eventRef.current({ type: 'disconnected', sessionId, unfinishedSpeechIds });
    } else {
      setError(true);
    }
  }, [pause]);

  const cancel = useCallback(() => {
    const { sessionId } = resources.current;
    const turnId = sessionId ? turn.current : undefined;
    pause(true);
    setError(false);
    const cleanup = sessionId ? discardSession(sessionId, turnId || undefined) : Promise.resolve();
    return { turnId, cleanup };
  }, [discardSession, pause]);

  const stop = useCallback(() => pause(), [pause]);

  const prepareOutline = useCallback(async () => {
    const socket = resources.current.socket;
    if (socket?.readyState !== WebSocket.OPEN || !resources.current.processor) return false;
    captureFrozen.current = true;
    const id = crypto.randomUUID();
    const startedAt = performance.now();
    const prepared = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        liveDiagnostic('outline-preparation-timeout', {
          timeoutMs: finalTranscriptTimeoutMs,
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        complete(false);
      }, finalTranscriptTimeoutMs);
      function complete(ok: boolean) {
        clearTimeout(timer);
        outlinePreparation.current = undefined;
        resolve(ok);
      }
      outlinePreparation.current = { id, complete };
      socket.send(JSON.stringify({ type: 'prepare_outline', requestId: id }));
    });
    if (!prepared) return false;
    liveDiagnostic('outline-preparation-confirmed', {
      elapsedMs: Math.round(performance.now() - startedAt),
    });
    return socket === resources.current.socket;
  }, []);

  const finishOutline = useCallback((callId: string, accepted: boolean) => {
    const socket = resources.current.socket;
    if (socket?.readyState !== WebSocket.OPEN || !advanceCalls.current.delete(callId)) return false;
    socket.send(JSON.stringify({ type: 'advance_to_outline_result', callId, accepted }));
    return true;
  }, []);

  const resumeCapture = useCallback(() => {
    if (!captureFrozen.current) return;
    captureFrozen.current = false;
    const socket = resources.current.socket;
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify({ type: 'resume_outline' }));
  }, []);

  const reset = useCallback(async () => {
    pause();
    setError(false);
    await clearPending(authorId, projectId);
  }, [authorId, pause, projectId]);

  const play = useCallback((event: LiveEvent) => {
    const mime = /^audio\/pcm(?:;\s*rate=(\d+))?$/.exec(event.mimeType ?? '');
    const context = playback.current.context;
    if (!event.data || !mime || !context || context.state === 'closed') return;
    const rate = mime[1] ? Number(mime[1]) : 24000;
    if (!Number.isInteger(rate) || rate < 8000 || rate > 48000) return;
    const bytes = fromBase64(event.data);
    if (!bytes.length || bytes.length % 2) return;
    const buffer = context.createBuffer(1, bytes.length / 2, rate);
    const samples = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const start = Math.max(context.currentTime, playback.current.next);
    source.start(start);
    playback.current.next = start + buffer.duration;
    playback.current.sources.push(source);
    source.onended = () => {
      source.disconnect();
      if (!playback.current.sources.includes(source)) return;
      playback.current.sources = playback.current.sources.filter((item) => item !== source);
      if (!playback.current.sources.length) setState('listening');
    };
    setState('speaking');
  }, []);

  const capture = useCallback(
    (context: AudioContext, stream: MediaStream, onAudio: (data: ArrayBuffer) => void) => {
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, 'biographer-capture');
      resources.current.source = source;
      resources.current.processor = processor;
      processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (resources.current.processor === processor) onAudio(event.data);
      };
      processor.onprocessorerror = () => {
        if (resources.current.processor !== processor) return;
        disconnect();
      };
      source.connect(processor);
      processor.connect(context.destination);
    },
    [disconnect],
  );

  const start = useCallback(async () => {
    pause();
    const startingEpoch = epoch.current;
    setError(false);
    setState('connecting');
    try {
      if (!navigator.onLine || document.visibilityState !== 'visible') throw new Error('Not ready');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (epoch.current !== startingEpoch) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      resources.current.stream = stream;
      const context = new AudioContext();
      resources.current.context = context;
      await context.resume();
      if (epoch.current !== startingEpoch) return;
      playback.current.context = context;
      await context.audioWorklet.addModule('/audio/biographer-capture.js');
      if (epoch.current !== startingEpoch) return;
      const response = await fetch(`${basePath}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      if (!response.ok) throw new Error('Session unavailable');
      const session = (await response.json()) as {
        sessionId: string;
        ticket: string;
        liveUrl: string;
      };
      if (epoch.current !== startingEpoch) {
        void discardSession(session.sessionId).catch(() =>
          liveDiagnostic('cancelled-session-cleanup-failed'),
        );
        return;
      }
      resources.current.sessionId = session.sessionId;
      turn.current = crypto.randomUUID();
      const socket = new WebSocket(session.liveUrl);
      resources.current.socket = socket;
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: 'authenticate',
            ticket: session.ticket,
            projectId,
            sessionId: session.sessionId,
          }),
        );
      socket.onmessage = (message) => {
        if (socket !== resources.current.socket) return;
        let event: LiveEvent;
        try {
          event = JSON.parse(String(message.data)) as LiveEvent;
        } catch {
          return;
        }
        if (event.turnId) {
          if (
            event.type === 'speech_detected' ||
            (event.type === 'transcript' && event.role === 'user' && !event.final)
          )
            unfinishedSpeech.current.add(event.turnId);
          if (event.type === 'transcript' && event.role === 'user' && event.final)
            unfinishedSpeech.current.delete(event.turnId);
        }
        if (event.type === 'outline_prepared') {
          const preparation = outlinePreparation.current;
          if (preparation && preparation.id === event.requestId) preparation.complete(true);
        }
        if (event.type === 'advance_to_outline' && event.callId) {
          if (advanceCalls.current.has(event.callId)) return;
          advanceCalls.current.add(event.callId);
        }
        if (event.type === 'advance_to_outline_cancelled' && event.callId)
          advanceCalls.current.delete(event.callId);
        if (event.type === 'ready') {
          if (!resources.current.stream || resources.current.processor) return;
          eventRef.current({ type: 'capture_started', turnId: turn.current });
          setState('listening');
          try {
            capture(context, stream, (data) => {
              if (captureFrozen.current || socket.readyState !== WebSocket.OPEN) return;
              socket.send(
                JSON.stringify({ type: 'audio', data: toBase64(data), turnId: turn.current }),
              );
            });
          } catch {
            disconnect();
          }
        }
        if (event.type === 'media') {
          try {
            play(event);
          } catch {
            disconnect();
          }
        }
        if (event.type === 'interrupted') {
          liveDiagnostic('interrupted');
          stopPlayback();
          setState('listening');
        }
        if (event.type === 'capture_boundary' && event.turnId === turn.current && event.nextTurnId)
          turn.current = event.nextTurnId;
        if (event.type === 'reconnecting') setState('reconnecting');
        if (event.type === 'error') {
          liveDiagnostic('gateway-error', {
            code: /^[A-Z_]{1,60}$/.test(event.code ?? '') ? event.code! : 'UNKNOWN',
          });
          disconnect();
        }
        eventRef.current(event);
      };
      socket.onerror = () => {
        if (socket !== resources.current.socket) return;
        liveDiagnostic('socket-error');
        disconnect();
      };
      socket.onclose = (event) => {
        if (resources.current.socket === socket) {
          liveDiagnostic('socket-closed', { code: event.code, clean: event.wasClean });
          disconnect();
        }
      };
    } catch {
      if (epoch.current !== startingEpoch) return;
      setError(true);
      pause();
    }
  }, [basePath, capture, discardSession, disconnect, pause, play, projectId, stopPlayback]);

  useEffect(() => {
    if (authorId)
      // Read only to let the usual retention policy expire legacy entries.
      void pendingSegments(authorId, projectId).catch(() => {
        liveDiagnostic('legacy-live-audio-cleanup-failed');
      });
  }, [authorId, projectId]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      if (resources.current.processor) {
        liveDiagnostic('page-hidden');
        disconnect();
      } else {
        pause();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [disconnect, pause]);
  useEffect(() => () => pause(), [pause]);

  return {
    state,
    error,
    start,
    stop,
    cancel,
    reset,
    prepareOutline,
    finishOutline,
    resumeCapture,
  };
}

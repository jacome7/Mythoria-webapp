'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { concatenate, fromBase64, toBase64 } from '@/utils/biographer/audio';
import { guestIntentHeaders } from '@/utils/biographer/guest';
import {
  clearPending,
  pendingSegments,
  removePending,
  savePending,
  type PendingSegment,
} from '@/utils/biographer/pending';

function liveDiagnostic(event: string, details?: Record<string, number | string | boolean>) {
  if (process.env.NODE_ENV === 'development') console.info('[Biographer live]', event, details);
}

const finalTranscriptTimeoutMs = 20_000;

// Keep this floor aligned with the gateway's test for a possibly audible live input.
function hasAudiblePcm(data: ArrayBuffer) {
  if (!data.byteLength || data.byteLength % 2) return true;
  const pcm = new DataView(data);
  let squares = 0;
  for (let offset = 0; offset < pcm.byteLength; offset += 2) {
    const sample = pcm.getInt16(offset, true);
    squares += sample * sample;
  }
  return squares >= (pcm.byteLength / 2) * 64 ** 2;
}

export type LiveState = 'paused' | 'connecting' | 'listening' | 'speaking' | 'reconnecting';
export type SaveState = 'saved' | 'saving' | 'local' | 'attention';
export interface LiveEvent {
  type: string;
  role?: 'user' | 'assistant';
  turnId?: string;
  nextTurnId?: string;
  callId?: string;
  requestId?: string;
  text?: string;
  final?: boolean;
  mimeType?: string;
  data?: string;
  code?: string;
  remainingSeconds?: number;
}

export function useBiographerLive(
  projectId: string,
  authorId: string,
  onEvent: (event: LiveEvent) => void,
  guest = false,
  skipSilentArchive = false,
) {
  const basePath = guest ? '/api/biographer/contribution' : `/api/biographer/projects/${projectId}`;
  const [state, setState] = useState<LiveState>('paused');
  const [saving, setSaving] = useState<SaveState>('saved');
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
  const archive = useRef<ArrayBuffer[]>([]);
  const archiveStartedForTurn = useRef(false);
  const archivePreroll = useRef<ArrayBuffer[]>([]);
  const turn = useRef('');
  const sequence = useRef(0);
  const queue = useRef(Promise.resolve());
  const uploadInFlight = useRef<Promise<'timed-out' | undefined> | undefined>(undefined);
  const dirtyAudio = useRef(false);
  const queuedWrites = useRef(0);
  const failedSegments = useRef<PendingSegment[]>([]);
  const epoch = useRef(0);
  const playback = useRef<{
    context?: AudioContext;
    next: number;
    sources: AudioBufferSourceNode[];
  }>({ next: 0, sources: [] });
  const archiveStartedAt = useRef<string | undefined>(undefined);
  const uploadRequest = useRef<AbortController | undefined>(undefined);
  const uploadingTurn = useRef<string | undefined>(undefined);
  const cancelledTurns = useRef(new Set<string>());
  const resetInProgress = useRef(false);
  const advanceCalls = useRef(new Set<string>());
  const captureFrozen = useRef(false);
  const outlinePreparation = useRef<
    | {
        id: string;
        complete: (prepared: boolean) => void;
      }
    | undefined
  >(undefined);

  const uploadPending = useCallback(async () => {
    const controller = new AbortController();
    uploadRequest.current = controller;
    let timedOut = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    try {
      const upload = async (segment: PendingSegment) => {
        if (controller.signal.aborted) return;
        if (cancelledTurns.current.has(segment.turnId)) {
          await removePending(segment.id);
          return;
        }
        uploadingTurn.current = segment.turnId;
        // Each segment can make progress independently, even in a large recovery queue.
        clearTimeout(deadline);
        deadline = setTimeout(() => {
          if (controller.signal.aborted) return;
          timedOut = true;
          controller.abort();
        }, 30_000);
        const digest = await crypto.subtle.digest('SHA-256', segment.data);
        if (controller.signal.aborted || cancelledTurns.current.has(segment.turnId)) return;
        const sha256 = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
        const response = await fetch(`${basePath}/segments`, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(guest ? guestIntentHeaders({ projectId, participantId: authorId }) : {}),
          },
          body: JSON.stringify({
            id: segment.id,
            turnId: segment.turnId,
            sequence: segment.sequence,
            contentType: 'audio/pcm;rate=16000',
            data: toBase64(segment.data),
            sha256,
            durationMs: segment.durationMs,
            capturedAt: segment.capturedAt,
          }),
        });
        if (response.status === 410) {
          await removePending(segment.id);
          return;
        }
        if (!response.ok) {
          const payload = await response
            .clone()
            .json()
            .catch(() => ({}));
          if (
            guest &&
            (response.status === 401 ||
              (response.status === 409 && String(payload.error || '').includes('session changed')))
          ) {
            setError(true);
            const current = resources.current;
            current.processor?.disconnect();
            current.source?.disconnect();
            current.stream?.getTracks().forEach((track) => track.stop());
            const buffers = archive.current.splice(0);
            if (buffers.length && current.sessionId) {
              const data = concatenate(buffers);
              const capturedAt = archiveStartedAt.current ?? new Date().toISOString();
              archiveStartedAt.current = undefined;
              const tail: PendingSegment = {
                id: crypto.randomUUID(),
                authorId,
                projectId,
                sessionId: current.sessionId,
                turnId: turn.current,
                sequence: sequence.current++,
                durationMs: Math.round(data.byteLength / 32),
                data,
                capturedAt,
              };
              try {
                await savePending(tail);
              } catch {
                failedSegments.current.push(tail);
              }
            }
            if (current.context) void current.context.close();
            current.socket?.close();
            resources.current = {};
            setState('paused');
          }
          throw new Error('Upload failed');
        }
        const ack = await response.json();
        if (
          ack.saved !== true ||
          ack.id !== segment.id ||
          ack.sequence !== segment.sequence ||
          ack.sha256 !== sha256
        )
          throw new Error('Invalid save acknowledgement');
        await removePending(segment.id);
      };
      const pending = await pendingSegments(authorId, projectId);
      if (pending.some((segment) => !cancelledTurns.current.has(segment.turnId))) {
        dirtyAudio.current = true;
        setSaving((status) => (status === 'saved' ? 'saving' : status));
      }
      for (const segment of pending) await upload(segment);
      while (failedSegments.current.length && !controller.signal.aborted) {
        const segment = failedSegments.current[0];
        if (!cancelledTurns.current.has(segment.turnId)) await savePending(segment);
        failedSegments.current = failedSegments.current.filter(({ id }) => id !== segment.id);
        await upload(segment);
      }
      controller.signal.throwIfAborted();
      const remaining = await pendingSegments(authorId, projectId);
      controller.signal.throwIfAborted();
      dirtyAudio.current = Boolean(
        remaining.some((segment) => !cancelledTurns.current.has(segment.turnId)) ||
        queuedWrites.current ||
        archive.current.length ||
        failedSegments.current.length,
      );
      setSaving(dirtyAudio.current ? 'saving' : 'saved');
    } catch {
      if (timedOut) liveDiagnostic('audio-sync-timeout');
      if ((timedOut || !controller.signal.aborted) && dirtyAudio.current)
        setSaving(navigator.onLine ? 'attention' : 'local');
    } finally {
      clearTimeout(deadline);
      uploadingTurn.current = undefined;
      uploadRequest.current = undefined;
    }
    return timedOut ? ('timed-out' as const) : undefined;
  }, [authorId, projectId, basePath, guest]);

  const sync = useCallback(() => {
    if (uploadInFlight.current) return uploadInFlight.current;
    if (resetInProgress.current || !authorId) return Promise.resolve();
    uploadInFlight.current = uploadPending().finally(() => {
      uploadInFlight.current = undefined;
    });
    return uploadInFlight.current;
  }, [authorId, uploadPending]);

  const flush = useCallback(() => {
    const buffers = archive.current.splice(0);
    const capturedAt = archiveStartedAt.current ?? new Date().toISOString();
    archiveStartedAt.current = undefined;
    if (!buffers.length || !resources.current.sessionId) return;
    const data = concatenate(buffers);
    const segment: PendingSegment = {
      id: crypto.randomUUID(),
      authorId,
      projectId,
      sessionId: resources.current.sessionId,
      turnId: turn.current,
      sequence: sequence.current++,
      durationMs: Math.round(data.byteLength / 32),
      data,
      capturedAt,
    };
    dirtyAudio.current = true;
    setSaving('saving');
    queuedWrites.current += 1;
    queue.current = queue.current
      .then(async () => {
        if (!cancelledTurns.current.has(segment.turnId)) await savePending(segment);
        queuedWrites.current -= 1;
        void sync();
      })
      .catch(() => {
        queuedWrites.current = Math.max(0, queuedWrites.current - 1);
        if (cancelledTurns.current.has(segment.turnId)) return;
        failedSegments.current.push(segment);
        const tail = archive.current.splice(0);
        if (tail.length) {
          const capturedAt = archiveStartedAt.current ?? new Date().toISOString();
          archiveStartedAt.current = undefined;
          const data = concatenate(tail);
          failedSegments.current.push({
            ...segment,
            sessionId: resources.current.sessionId ?? segment.sessionId,
            turnId: turn.current,
            id: crypto.randomUUID(),
            sequence: sequence.current++,
            durationMs: Math.round(data.byteLength / 32),
            data,
            capturedAt,
          });
        }
        setSaving('attention');
        setError(true);
        const current = resources.current;
        current.processor?.disconnect();
        current.source?.disconnect();
        current.stream?.getTracks().forEach((track) => track.stop());
        if (current.context) void current.context.close();
        current.socket?.close();
        resources.current = {};
        setState('paused');
      });
  }, [authorId, projectId, sync]);

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
      archiveStartedForTurn.current = false;
      archivePreroll.current = [];
      if (!discard && !resetInProgress.current) flush();
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
    [flush, stopPlayback],
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

  const cancel = useCallback(() => {
    const { sessionId } = resources.current;
    const turnId = sessionId ? turn.current : undefined;
    if (turnId) {
      cancelledTurns.current.add(turnId);
      if (uploadingTurn.current === turnId) uploadRequest.current?.abort();
      failedSegments.current = failedSegments.current.filter(
        (segment) => segment.turnId !== turnId,
      );
      void queue.current
        .then(async () => {
          const pending = await pendingSegments(authorId, projectId);
          await Promise.all(
            pending
              .filter((segment) => segment.turnId === turnId)
              .map(({ id }) => removePending(id)),
          );
        })
        .catch(() => liveDiagnostic('cancelled-audio-local-cleanup-failed'))
        .then(() => {
          void sync();
        });
    }
    archive.current = [];
    archiveStartedAt.current = undefined;
    pause(true);
    dirtyAudio.current = Boolean(failedSegments.current.length);
    setSaving(dirtyAudio.current ? 'attention' : 'saved');
    setError(false);

    const cleanup = sessionId ? discardSession(sessionId, turnId || undefined) : Promise.resolve();
    return { turnId, cleanup };
  }, [authorId, discardSession, pause, projectId, sync]);

  const stop = useCallback(async () => {
    const activeUpload = uploadInFlight.current;
    pause();
    await queue.current;
    if ((await (activeUpload ?? uploadInFlight.current)) !== 'timed-out') await sync();
  }, [pause, sync]);

  const prepareOutline = useCallback(async () => {
    const socket = resources.current.socket;
    if (socket?.readyState !== WebSocket.OPEN || !resources.current.processor) return false;
    captureFrozen.current = true;
    flush();
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
    await queue.current;
    if ((await uploadInFlight.current) === 'timed-out') return false;
    await sync();
    return socket === resources.current.socket && !dirtyAudio.current;
  }, [flush, sync]);

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
    resetInProgress.current = true;
    uploadRequest.current?.abort();
    pause();
    try {
      await queue.current;
      await uploadInFlight.current;
      failedSegments.current = [];
      archive.current = [];
      archiveStartedAt.current = undefined;
      await clearPending(authorId, projectId);
      dirtyAudio.current = false;
      setSaving('saved');
      setError(false);
    } finally {
      resetInProgress.current = false;
    }
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
        setError(true);
        pause();
      };
      source.connect(processor);
      processor.connect(context.destination);
    },
    [pause],
  );

  const start = useCallback(async () => {
    if (failedSegments.current.length) {
      setError(true);
      setSaving('attention');
      return;
    }
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
          ...(guest ? guestIntentHeaders({ projectId, participantId: authorId }) : {}),
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
        if (skipSilentArchive) {
          void discardSession(session.sessionId).catch(() =>
            liveDiagnostic('cancelled-session-cleanup-failed'),
          );
        } else {
          void fetch(`${basePath}/sessions/${session.sessionId}`, {
            method: 'PATCH',
            headers: guest ? guestIntentHeaders({ projectId, participantId: authorId }) : {},
          }).catch(() => undefined);
        }
        return;
      }
      resources.current.sessionId = session.sessionId;
      turn.current = crypto.randomUUID();
      sequence.current = 0;
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
        if (
          skipSilentArchive &&
          event.type === 'speech_detected' &&
          event.turnId === turn.current &&
          !archiveStartedForTurn.current
        ) {
          archiveStartedForTurn.current = true;
          const preroll = archivePreroll.current.splice(0);
          if (preroll.length) {
            archive.current.push(...preroll);
            archiveStartedAt.current ??= new Date().toISOString();
            dirtyAudio.current = true;
            setSaving('saving');
          }
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
          if (!resources.current.stream || socket !== resources.current.socket) return;
          setState('listening');
          try {
            capture(context, stream, (data) => {
              if (captureFrozen.current || socket.readyState !== WebSocket.OPEN) return;
              socket.send(
                JSON.stringify({ type: 'audio', data: toBase64(data), turnId: turn.current }),
              );
              if (skipSilentArchive && !archiveStartedForTurn.current) {
                if (!hasAudiblePcm(data)) {
                  // Retain a short lead-in for the start of the next recoverable answer.
                  archivePreroll.current.push(data);
                  if (archivePreroll.current.length > 5) archivePreroll.current.shift();
                  return;
                }
                archiveStartedForTurn.current = true;
                archive.current.push(...archivePreroll.current.splice(0));
              }
              archiveStartedAt.current ??= new Date().toISOString();
              dirtyAudio.current = true;
              archive.current.push(data);
              setSaving('saving');
              if (archive.current.reduce((total, item) => total + item.byteLength, 0) >= 32000)
                flush();
            });
          } catch {
            setError(true);
            pause();
          }
        }
        if (event.type === 'media') {
          try {
            play(event);
          } catch {
            setError(true);
            pause();
          }
        }
        if (event.type === 'interrupted') {
          liveDiagnostic('interrupted');
          stopPlayback();
          setState('listening');
        }
        if (
          (event.type === 'capture_boundary' ||
            (event.type === 'transcript' && event.role === 'user' && event.final) ||
            event.type === 'turn_complete') &&
          event.turnId === turn.current
        ) {
          flush();
          turn.current = event.nextTurnId ?? crypto.randomUUID();
          sequence.current = 0;
          archiveStartedForTurn.current = false;
          archivePreroll.current = [];
        }
        if (event.type === 'reconnecting') setState('reconnecting');
        if (event.type === 'error') {
          liveDiagnostic('gateway-error', {
            code: /^[A-Z_]{1,60}$/.test(event.code ?? '') ? event.code! : 'UNKNOWN',
          });
          setError(true);
          pause();
        }
        eventRef.current(event);
      };
      socket.onerror = () => {
        if (socket !== resources.current.socket) return;
        liveDiagnostic('socket-error');
        setError(true);
        pause();
      };
      socket.onclose = (event) => {
        if (resources.current.socket === socket) {
          liveDiagnostic('socket-closed', { code: event.code, clean: event.wasClean });
          setError(true);
          pause();
        }
      };
    } catch {
      if (epoch.current !== startingEpoch) return;
      setError(true);
      pause();
    }
  }, [
    authorId,
    basePath,
    capture,
    discardSession,
    flush,
    guest,
    pause,
    play,
    projectId,
    skipSilentArchive,
    stopPlayback,
  ]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        if (resources.current.socket) liveDiagnostic('page-hidden');
        pause();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('online', sync);
    void sync();
    const retry = window.setInterval(() => {
      void sync();
    }, 5000);
    return () => {
      window.clearInterval(retry);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('online', sync);
    };
  }, [pause, sync]);
  useEffect(() => {
    if (saving === 'saved') return;
    const leave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [saving]);
  useEffect(() => () => pause(), [pause]);
  return {
    state,
    saving,
    error,
    start,
    pause,
    stop,
    cancel,
    sync,
    reset,
    prepareOutline,
    finishOutline,
    resumeCapture,
  };
}

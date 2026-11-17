'use client';

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { concatenate, fromBase64, toBase64 } from '@/utils/biographer/audio';
import { guestIntentHeaders } from '@/utils/biographer/guest';
import {
  pendingSegments,
  removePending,
  savePending,
  type PendingSegment,
} from '@/utils/biographer/pending';

// Gemini Live Avatar labels its H.264/AAC fragmented MP4 stream as bare video/mp4.
const avatarMp4Type = 'video/mp4; codecs="avc1.42C01F, mp4a.40.2"';

function liveDiagnostic(event: string, details?: Record<string, number | string | boolean>) {
  if (process.env.NODE_ENV === 'development') console.info('[Biographer live]', event, details);
}

export function reportAvatarVideo(event: SyntheticEvent<HTMLVideoElement>) {
  if (process.env.NODE_ENV !== 'development') return;
  const video = event.currentTarget;
  let bufferedAhead = 0;
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) > video.currentTime)
      bufferedAhead = video.buffered.end(i) - video.currentTime;
  }
  liveDiagnostic(`video-${event.type}`, {
    positionMs: Math.round(video.currentTime * 1000),
    bufferedAheadMs: Math.round(bufferedAhead * 1000),
    readyState: video.readyState,
    mediaError: video.error?.code ?? 0,
  });
}

export type LiveState =
  'paused' | 'connecting' | 'listening' | 'speaking' | 'reconnecting' | 'recording';
export type SaveState = 'saved' | 'saving' | 'local' | 'attention';
export interface LiveEvent {
  type: string;
  role?: 'user' | 'assistant';
  turnId?: string;
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
) {
  const basePath = guest ? '/api/biographer/contribution' : `/api/biographer/projects/${projectId}`;
  const [state, setState] = useState<LiveState>('paused');
  const [saving, setSaving] = useState<SaveState>('saved');
  const [error, setError] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>();
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
  const turn = useRef('');
  const sequence = useRef(0);
  const queue = useRef(Promise.resolve());
  const uploading = useRef(false);
  const queuedWrites = useRef(0);
  const failedSegments = useRef<PendingSegment[]>([]);
  const epoch = useRef(0);
  const playback = useRef<{
    context?: AudioContext;
    next: number;
    sources: AudioBufferSourceNode[];
    media?: MediaSource;
    buffer?: SourceBuffer;
    chunks: Uint8Array<ArrayBuffer>[];
  }>({ next: 0, sources: [], chunks: [] });
  const videoUrlRef = useRef<string | undefined>(undefined);

  const sync = useCallback(async () => {
    if (uploading.current || !authorId) return;
    uploading.current = true;
    try {
      const upload = async (segment: PendingSegment) => {
        const digest = await crypto.subtle.digest('SHA-256', segment.data);
        const sha256 = [...new Uint8Array(digest)]
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
        const response = await fetch(`${basePath}/segments`, {
          method: 'POST',
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
          }),
        });
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
              const tail: PendingSegment = {
                id: crypto.randomUUID(),
                authorId,
                projectId,
                sessionId: current.sessionId,
                turnId: turn.current,
                sequence: sequence.current++,
                durationMs: Math.round(data.byteLength / 32),
                data,
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
      if (pending.length) setSaving('saving');
      for (const segment of pending) await upload(segment);
      while (failedSegments.current.length) {
        const segment = failedSegments.current[0];
        await savePending(segment);
        failedSegments.current.shift();
        await upload(segment);
      }
      const remaining = await pendingSegments(authorId, projectId);
      setSaving(
        remaining.length ||
          queuedWrites.current ||
          archive.current.length ||
          failedSegments.current.length
          ? 'saving'
          : 'saved',
      );
    } catch {
      setSaving(navigator.onLine ? 'attention' : 'local');
    } finally {
      uploading.current = false;
    }
  }, [authorId, projectId, basePath, guest]);

  const flush = useCallback(() => {
    const buffers = archive.current.splice(0);
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
    };
    setSaving('saving');
    queuedWrites.current += 1;
    queue.current = queue.current
      .then(async () => {
        await savePending(segment);
        queuedWrites.current -= 1;
        await sync();
      })
      .catch(() => {
        queuedWrites.current = Math.max(0, queuedWrites.current - 1);
        failedSegments.current.push(segment);
        const tail = archive.current.splice(0);
        if (tail.length) {
          const data = concatenate(tail);
          failedSegments.current.push({
            ...segment,
            id: crypto.randomUUID(),
            sequence: sequence.current++,
            durationMs: Math.round(data.byteLength / 32),
            data,
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
    playback.current.chunks = [];
    if (playback.current.buffer && !playback.current.buffer.updating) {
      try {
        playback.current.buffer.abort();
      } catch {
        /* Stream ended. */
      }
    }
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = undefined;
    playback.current.media = undefined;
    playback.current.buffer = undefined;
    setVideoUrl(undefined);
  }, []);

  const pause = useCallback(() => {
    epoch.current += 1;
    flush();
    const current = resources.current;
    current.processor?.disconnect();
    current.source?.disconnect();
    current.stream?.getTracks().forEach((track) => track.stop());
    if (current.context) void current.context.close();
    if (current.socket?.readyState === WebSocket.OPEN)
      current.socket.send(JSON.stringify({ type: 'pause' }));
    current.socket?.close();
    resources.current = {};
    stopPlayback();
    setState('paused');
  }, [flush, stopPlayback]);

  const play = useCallback(
    (event: LiveEvent) => {
      if (!event.data || !event.mimeType) return;
      const bytes = fromBase64(event.data);
      if (event.mimeType.startsWith('audio/pcm')) {
        const context = playback.current.context;
        if (!context || context.state === 'closed') return;
        const buffer = context.createBuffer(1, Math.floor(bytes.length / 2), 24000);
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
          playback.current.sources = playback.current.sources.filter((item) => item !== source);
          if (!playback.current.sources.length) setState('listening');
        };
      } else if (event.mimeType.startsWith('video/')) {
        if (typeof MediaSource === 'undefined') {
          liveDiagnostic('media-source-unavailable');
          setError(true);
          pause();
          return;
        }
        if (!playback.current.media) {
          const mimeType = event.mimeType === 'video/mp4' ? avatarMp4Type : event.mimeType;
          if (!MediaSource.isTypeSupported(mimeType)) {
            liveDiagnostic('media-type-unsupported');
            setError(true);
            pause();
            return;
          }
          const media = new MediaSource();
          playback.current.media = media;
          const url = URL.createObjectURL(media);
          videoUrlRef.current = url;
          setVideoUrl(url);
          media.addEventListener(
            'sourceopen',
            () => {
              if (playback.current.media !== media) return;
              let buffer: SourceBuffer;
              try {
                buffer = media.addSourceBuffer(mimeType);
              } catch {
                liveDiagnostic('source-buffer-creation-failed');
                setError(true);
                pause();
                return;
              }
              playback.current.buffer = buffer;
              const append = () => {
                if (
                  playback.current.buffer === buffer &&
                  !buffer.updating &&
                  playback.current.chunks.length
                ) {
                  try {
                    buffer.appendBuffer(playback.current.chunks.shift()!);
                  } catch {
                    liveDiagnostic('source-buffer-append-failed');
                    setError(true);
                    pause();
                  }
                }
              };
              buffer.addEventListener('updateend', append);
              buffer.addEventListener('error', () => {
                if (playback.current.buffer !== buffer) return;
                liveDiagnostic('source-buffer-decode-failed');
                setError(true);
                pause();
              });
              append();
            },
            { once: true },
          );
        }
        playback.current.chunks.push(bytes);
        const buffer = playback.current.buffer;
        if (buffer && !buffer.updating) {
          try {
            buffer.appendBuffer(playback.current.chunks.shift()!);
          } catch {
            liveDiagnostic('source-buffer-append-failed');
            setError(true);
            pause();
          }
        }
      }
    },
    [pause],
  );

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
        void fetch(`${basePath}/sessions/${session.sessionId}`, {
          method: 'PATCH',
          headers: guest ? guestIntentHeaders({ projectId, participantId: authorId }) : {},
        });
        return;
      }
      resources.current.sessionId = session.sessionId;
      turn.current = crypto.randomUUID();
      sequence.current = 0;
      const socket = new WebSocket(session.liveUrl);
      let lastVideoAt: number | undefined;
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
        if (event.type === 'ready') {
          if (!resources.current.stream || socket !== resources.current.socket) return;
          setState('listening');
          try {
            capture(context, stream, (data) => {
              if (socket.readyState !== WebSocket.OPEN) return;
              socket.send(
                JSON.stringify({ type: 'audio', data: toBase64(data), turnId: turn.current }),
              );
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
          if (process.env.NODE_ENV === 'development' && event.mimeType?.startsWith('video/')) {
            const now = performance.now();
            const gapMs = lastVideoAt === undefined ? 0 : Math.round(now - lastVideoAt);
            lastVideoAt = now;
            if (gapMs > 750) liveDiagnostic('video-delivery-gap', { gapMs });
          }
          setState('speaking');
          play(event);
        }
        if (event.type === 'interrupted') {
          liveDiagnostic('interrupted');
          stopPlayback();
          setState('listening');
        }
        if (
          ((event.type === 'transcript' && event.role === 'user' && event.final) ||
            event.type === 'turn_complete') &&
          event.turnId === turn.current
        ) {
          flush();
          turn.current = crypto.randomUUID();
          sequence.current = 0;
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
  }, [authorId, basePath, capture, flush, guest, pause, play, projectId, stopPlayback]);

  const startLocalRecording = useCallback(async () => {
    if (failedSegments.current.length) {
      setError(true);
      setSaving('attention');
      return;
    }
    pause();
    const startingEpoch = epoch.current;
    setError(false);
    try {
      if (!authorId || document.visibilityState !== 'visible') throw new Error('Not ready');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (epoch.current !== startingEpoch) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      resources.current.stream = stream;
      const context = new AudioContext();
      resources.current.context = context;
      await context.resume();
      if (epoch.current !== startingEpoch) return;
      resources.current.sessionId = crypto.randomUUID();
      turn.current = crypto.randomUUID();
      sequence.current = 0;
      await context.audioWorklet.addModule('/audio/biographer-capture.js');
      if (epoch.current !== startingEpoch) return;
      capture(context, stream, (data) => {
        archive.current.push(data);
        setSaving('local');
        if (archive.current.reduce((total, item) => total + item.byteLength, 0) >= 32000) flush();
      });
      setState('recording');
    } catch {
      if (epoch.current !== startingEpoch) return;
      setError(true);
      pause();
    }
  }, [authorId, capture, flush, pause]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        if (resources.current.socket) liveDiagnostic('page-hidden');
        pause();
      }
    };
    const leave = (event: BeforeUnloadEvent) => {
      if (saving !== 'saved') {
        event.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('online', sync);
    window.addEventListener('beforeunload', leave);
    void sync();
    const retry = window.setInterval(() => {
      void sync();
    }, 5000);
    return () => {
      window.clearInterval(retry);
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('online', sync);
      window.removeEventListener('beforeunload', leave);
    };
  }, [pause, saving, sync]);
  useEffect(() => () => pause(), [pause]);
  return { state, saving, error, videoUrl, start, startLocalRecording, pause, sync };
}

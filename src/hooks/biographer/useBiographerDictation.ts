'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { concatenate, toBase64 } from '@/utils/biographer/audio';
import {
  clearPending,
  isPendingAudioExpired,
  pendingSegments,
  removePending,
  savePending,
  type PendingSegment,
} from '@/utils/biographer/pending';

const MAX_BYTES = 1920000; // 60 seconds of mono 16 kHz PCM.
type DictationState = 'idle' | 'starting' | 'recording' | 'transcribing';

interface Recording {
  id: string;
  stream?: MediaStream;
  context?: AudioContext;
  source?: MediaStreamAudioSourceNode;
  processor?: AudioWorkletNode;
  buffers: ArrayBuffer[];
  bytes: number;
  capturedAt?: string;
  journaledThrough: number;
}

export function useBiographerDictation(
  draftId: string,
  projectId: string,
  authorId: string,
  onDraft: (text: string, segmentId: string) => Promise<void>,
) {
  const [state, setState] = useState<DictationState>('idle');
  const [error, setError] = useState(false);
  const [hasPending, setHasPending] = useState(false);
  const recording = useRef<Recording | undefined>(undefined);
  const request = useRef<AbortController | undefined>(undefined);
  const recoverable = useRef<PendingSegment | undefined>(undefined);
  const journal = useRef(Promise.resolve());
  const generation = useRef(0);
  const callback = useRef(onDraft);
  callback.current = onDraft;

  const disconnect = useCallback(() => {
    const current = recording.current;
    recording.current = undefined;
    current?.processor?.disconnect();
    current?.source?.disconnect();
    current?.stream?.getTracks().forEach((track) => track.stop());
    if (current?.context) void current.context.close().catch(() => undefined);
    return current;
  }, []);

  const persist = useCallback(
    (current: Recording) => {
      if (!current.capturedAt || current.bytes <= current.journaledThrough) return;
      current.journaledThrough = current.bytes;
      const segment: PendingSegment = {
        id: current.id,
        authorId,
        projectId,
        sessionId: current.id,
        turnId: current.id,
        sequence: 0,
        durationMs: Math.round(current.bytes / 32),
        capturedAt: current.capturedAt,
        purpose: 'dictation',
        data: concatenate(current.buffers),
      };
      recoverable.current = segment;
      setHasPending(true);
      journal.current = journal.current
        .then(() => savePending(segment))
        .catch(() => {
          setError(true);
        });
    },
    [authorId, projectId],
  );

  const retry = useCallback(async () => {
    if (request.current || !authorId) return;
    const controller = new AbortController();
    request.current = controller;
    setState('transcribing');
    setError(false);
    try {
      await journal.current;
      const segment =
        recoverable.current ?? (await pendingSegments(authorId, projectId, 'dictation')).at(-1);
      if (controller.signal.aborted) return;
      if (!segment || isPendingAudioExpired(segment)) {
        recoverable.current = undefined;
        setHasPending(false);
        return;
      }
      const response = await fetch(`/api/story-whisperer/${draftId}/dictation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-story-whisperer-project': projectId,
        },
        body: JSON.stringify({
          contentType: 'audio/pcm;rate=16000',
          data: toBase64(segment.data),
          capturedAt: segment.capturedAt,
        }),
        signal: controller.signal,
      });
      if (response.status === 410) {
        recoverable.current = undefined;
        await removePending(segment.id);
        if (!controller.signal.aborted) setHasPending(false);
        return;
      }
      if (!response.ok) throw new Error('Transcription unavailable');
      const result = await response.json();
      if (controller.signal.aborted) return;
      if (typeof result.text !== 'string' || !result.text.trim()) throw new Error('No transcript');
      await callback.current(result.text.trim(), segment.id);
      if (controller.signal.aborted) return;
      await removePending(segment.id);
      if (recoverable.current?.id === segment.id) recoverable.current = undefined;
      const remaining = await pendingSegments(authorId, projectId, 'dictation');
      if (!controller.signal.aborted) {
        setHasPending(remaining.some((pending) => pending.id !== segment.id));
        setError(false);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = undefined;
        setState('idle');
      }
    }
  }, [authorId, draftId, projectId]);

  const stop = useCallback(() => {
    const current = disconnect();
    if (!current) return;
    if (!current.bytes) {
      setState('idle');
      return;
    }
    persist(current);
    void retry();
  }, [disconnect, persist, retry]);

  const cancel = useCallback(async () => {
    generation.current += 1;
    request.current?.abort();
    request.current = undefined;
    disconnect();
    recoverable.current = undefined;
    await journal.current;
    if (authorId) await clearPending(authorId, projectId, 'dictation');
    setState('idle');
    setError(false);
    setHasPending(false);
  }, [authorId, disconnect, projectId]);

  const start = useCallback(async () => {
    if (!authorId || recording.current || request.current || hasPending) return;
    const current: Recording = {
      id: crypto.randomUUID(),
      buffers: [],
      bytes: 0,
      journaledThrough: 0,
    };
    recording.current = current;
    setError(false);
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (recording.current !== current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      current.stream = stream;
      const context = new AudioContext();
      current.context = context;
      await context.resume();
      await context.audioWorklet.addModule('/audio/biographer-capture.js');
      if (recording.current !== current) return;
      const processor = new AudioWorkletNode(context, 'biographer-capture');
      const source = context.createMediaStreamSource(stream);
      current.processor = processor;
      current.source = source;
      processor.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
        if (recording.current !== current) return;
        current.capturedAt ??= new Date().toISOString();
        current.buffers.push(data);
        current.bytes += data.byteLength;
        if (current.bytes >= MAX_BYTES) stop();
        else if (current.bytes - current.journaledThrough >= 32000) persist(current);
      };
      processor.onprocessorerror = () => {
        stop();
        setError(true);
      };
      source.connect(processor);
      processor.connect(context.destination);
      setState('recording');
    } catch {
      if (recording.current !== current) return;
      disconnect();
      setState('idle');
      setError(true);
    }
  }, [authorId, disconnect, hasPending, persist, stop]);

  useEffect(() => {
    if (!authorId) return;
    const currentGeneration = ++generation.current;
    void pendingSegments(authorId, projectId, 'dictation')
      .then((segments) => {
        if (generation.current === currentGeneration && segments.length) setHasPending(true);
      })
      .catch(() => undefined);
    const persistOnHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      const current = disconnect();
      if (current) {
        persist(current);
        setState('idle');
      }
    };
    document.addEventListener('visibilitychange', persistOnHidden);
    return () => {
      generation.current += 1;
      document.removeEventListener('visibilitychange', persistOnHidden);
      request.current?.abort();
      request.current = undefined;
      const current = disconnect();
      if (current) persist(current);
      recoverable.current = undefined;
    };
  }, [authorId, disconnect, persist, projectId]);

  return { state, error, hasPending, start, stop, retry, cancel };
}

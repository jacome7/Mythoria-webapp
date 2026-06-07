'use client';

import { useCallback } from 'react';

export interface JobPollResult<T = unknown> {
  status: 'completed' | 'failed';
  result?: T;
  error?: string;
}

interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Poll an async SGW job via GET /api/jobs/:jobId until it completes or fails.
 * Resolves (never rejects) with a terminal status so callers handle both paths.
 */
export function useJobPolling() {
  const pollJob = useCallback(
    async <T = unknown>(jobId: string, opts?: PollOptions): Promise<JobPollResult<T>> => {
      const intervalMs = opts?.intervalMs ?? 2000;
      const timeoutMs = opts?.timeoutMs ?? 5 * 60 * 1000;
      const start = Date.now();

      for (;;) {
        try {
          const resp = await fetch(`/api/jobs/${jobId}`);
          const data = await resp.json();
          const job = data?.job;
          if (job) {
            if (typeof job.progress === 'number') opts?.onProgress?.(job.progress);
            if (job.status === 'completed') return { status: 'completed', result: job.result as T };
            if (job.status === 'failed') {
              return { status: 'failed', error: job.error || 'Job failed' };
            }
          }
        } catch (e) {
          // Transient network error — keep polling until timeout
          console.warn('Job poll error (will retry):', e);
        }

        if (Date.now() - start > timeoutMs) {
          return { status: 'failed', error: 'Timed out waiting for the job to finish' };
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    },
    [],
  );

  return { pollJob };
}

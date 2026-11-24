'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { ensureAnalyticsAttributionReceipt } from '@/lib/analytics/receipt-client';
import { CONSENT_UPDATED_EVENT, getStoredConsent } from '@/lib/consent';
import {
  activeExperiment,
  canObserveReader,
  productExperimentRelease,
  type ExperimentArm,
  type ExperimentId,
} from './release';

const currentExperiment = () => activeExperiment(productExperimentRelease, Date.now());
const noExperiment = () => null;

function subscribeSchedule(notify: () => void) {
  // Timers are unnecessary while the reviewed schedule is empty.
  const boundaries = Object.values(productExperimentRelease.windows)
    .flatMap((window) => [Date.parse(window.startsAt), Date.parse(window.endsAt)])
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    const now = Date.now();
    const next = boundaries.find((time) => time > now);
    if (next !== undefined)
      timer = setTimeout(
        () => {
          notify();
          schedule();
        },
        Math.min(next - now, 2_147_483_647),
      );
  };
  schedule();
  return () => clearTimeout(timer);
}

export function useActiveExperiment() {
  return useSyncExternalStore(subscribeSchedule, currentExperiment, noExperiment);
}

function observable() {
  const search = new URLSearchParams(location.search);
  return (
    window.location.origin === 'https://mythoria.pt' &&
    !navigator.webdriver &&
    !['gtm_debug', 'gtm_preview', 'gtm_auth'].some((key) => search.has(key)) &&
    !document.cookie.split(';').some((cookie) => cookie.trim().startsWith('__TAG_ASSISTANT=')) &&
    document.visibilityState === 'visible' &&
    getStoredConsent()?.state.analytics_storage === 'granted'
  );
}

async function record(
  data:
    { action: 'assign'; experiment: ExperimentId } | { action: 'reader_started' | 'reader_ended' },
  signal: AbortSignal,
) {
  if (!observable() || signal.aborted) return null;
  if (!(await ensureAnalyticsAttributionReceipt())) return null;
  if (!observable() || signal.aborted) return null;
  const response = await fetch('/api/product-experiments', {
    method: 'POST',
    credentials: 'same-origin',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
  if (!response.ok) return null;
  const { arm } = await response.json();
  return arm === 'control' || arm === 'treatment' ? (arm as ExperimentArm) : null;
}

export function useExperimentArm(id: ExperimentId, eligible = true) {
  const active = useActiveExperiment() === id;
  const [arm, setArm] = useState<ExperimentArm | null>(null);
  useEffect(() => {
    if (!eligible || !active) return;
    let pending: AbortController;
    const sync = () => {
      pending?.abort();
      pending = new AbortController();
      if (!observable()) {
        if (getStoredConsent()?.state.analytics_storage !== 'granted') setArm(null);
        return;
      }
      const signal = pending.signal;
      void record({ action: 'assign', experiment: id }, signal)
        .then((next) => {
          if (!signal.aborted && observable()) setArm(next);
        })
        .catch(() => undefined);
    };
    sync();
    window.addEventListener(CONSENT_UPDATED_EVENT, sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      pending?.abort();
      window.removeEventListener(CONSENT_UPDATED_EVENT, sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [id, eligible, active]);
  return eligible && active ? arm : null;
}

export function observeReader(action: 'reader_started' | 'reader_ended', signal: AbortSignal) {
  if (canObserveReader(productExperimentRelease, Date.now()))
    void record({ action }, signal).catch(() => undefined);
}

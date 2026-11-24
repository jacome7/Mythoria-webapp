'use client';

import { useCallback, useEffect, useRef } from 'react';
import { CONSENT_UPDATED_EVENT, getStoredConsent } from '@/lib/consent';
import { ensureAnalyticsAttributionReceipt } from '@/lib/analytics/receipt-client';
import { storyInputFingerprint } from '@/lib/story-templates/submission';
import type { CreationObservation, CreationOption } from './creation';

const storageKey = 'mythoria:creation-observation-v2';

type Observation = Pick<CreationObservation, 'firstOption' | 'entryKind'> & {
  grant: number;
  draftRef: string;
};

export function useCreationObservation(owner?: string | null, enabled = false) {
  const observation = useRef<Observation | null>(null);
  const browserOwner = useRef<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    browserOwner.current = undefined;
    observation.current = null;
    const updateOwner = () => {
      const consent = getStoredConsent();
      if (!enabled || !owner || consent?.state.analytics_storage !== 'granted') return;
      void storyInputFingerprint(owner)
        .then((fingerprint) => {
          if (active && getStoredConsent()?.timestamp === consent.timestamp)
            browserOwner.current = fingerprint;
        })
        .catch(() => undefined);
    };
    updateOwner();
    window.addEventListener(CONSENT_UPDATED_EVENT, updateOwner);
    return () => {
      active = false;
      window.removeEventListener(CONSENT_UPDATED_EVENT, updateOwner);
    };
  }, [owner, enabled]);
  const reset = useCallback(() => {
    observation.current = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Optional browser storage. */
    }
  }, []);
  useEffect(() => {
    const clear = () => {
      if (getStoredConsent()?.state.analytics_storage === 'granted') return;
      reset();
      browserOwner.current = undefined;
    };
    clear();
    window.addEventListener(CONSENT_UPDATED_EVENT, clear);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, clear);
  }, [reset]);

  function start(entryKind: CreationObservation['entryKind']) {
    if (!enabled) return;
    const consent = getStoredConsent();
    if (consent?.state.analytics_storage !== 'granted') {
      observation.current = null;
      return;
    }
    if (observation.current?.grant === consent.timestamp) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
      if (
        browserOwner.current &&
        saved?.owner === browserOwner.current &&
        saved.value?.grant === consent.timestamp &&
        saved.value?.draftRef
      ) {
        observation.current = saved.value;
        return;
      }
    } catch {
      // Treat unavailable session storage as an unobserved entry.
    }
    observation.current = {
      grant: consent.timestamp,
      draftRef: crypto.randomUUID(),
      entryKind,
      firstOption: entryKind === 'legacy' ? 'unknown' : 'no_observed_open',
    };
  }

  function open(option: CreationOption, entryKind: CreationObservation['entryKind']) {
    start(entryKind);
    const current = observation.current;
    if (current?.firstOption !== 'no_observed_open') return;
    current.firstOption = option;
    try {
      if (browserOwner.current)
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ owner: browserOwner.current, value: current }),
        );
    } catch {
      /* The draft remains usable in this tab. */
    }
    void ensureAnalyticsAttributionReceipt()
      .then((ready) => {
        if (!ready || getStoredConsent()?.timestamp !== current.grant) return;
        return fetch('/api/analytics/creation-open', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          keepalive: true,
          body: JSON.stringify({
            draftRef: current.draftRef,
            option,
            entryKind: current.entryKind,
          }),
        });
      })
      .catch(() => undefined);
  }

  function read(defaultEntry: CreationObservation['entryKind']) {
    start(defaultEntry);
    const current = observation.current;
    return (
      current && {
        firstOption: current.firstOption,
        entryKind: current.entryKind,
        draftRef: current.draftRef,
      }
    );
  }

  return { open, read, reset };
}

'use client';

import { useEffect, useState } from 'react';

export function useScreenAwake(active: boolean, enabled: boolean) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    const release = () => {
      setHeld(false);
      if (lock) void lock.release().catch(() => undefined);
      lock = undefined;
    };
    const acquire = async () => {
      if (
        !active ||
        !enabled ||
        disposed ||
        document.visibilityState !== 'visible' ||
        !('wakeLock' in navigator)
      )
        return;
      try {
        const candidate = await navigator.wakeLock.request('screen');
        if (disposed || document.visibilityState !== 'visible') {
          await candidate.release();
          return;
        }
        lock = candidate;
        setHeld(true);
        candidate.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
      else release();
    };
    document.addEventListener('visibilitychange', onVisible);
    void acquire();
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      release();
    };
  }, [active, enabled]);
  return held;
}

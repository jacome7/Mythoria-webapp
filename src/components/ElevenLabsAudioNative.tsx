'use client';

import { useEffect, useState } from 'react';

const SCRIPT_SRC = 'https://elevenlabs.io/player/audioNativeHelper.js';

export function ElevenLabsAudioNative({
  publicUserId,
  label,
  loading,
  unavailable,
}: {
  publicUserId: string;
  label: string;
  loading: string;
  unavailable: string;
}) {
  const [requested, setRequested] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!requested) return;

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => setFailed(true);
    document.body.appendChild(script);
    return () => script.remove();
  }, [requested]);

  if (!requested) {
    return (
      <button type="button" className="btn btn-outline" onClick={() => setRequested(true)}>
        {label}
      </button>
    );
  }

  return (
    <div
      id="elevenlabs-audionative-widget"
      data-height="90"
      data-width="100%"
      data-frameborder="no"
      data-scrolling="no"
      data-publicuserid={publicUserId}
      data-playerurl="https://elevenlabs.io/player/index.html"
      data-small="True"
    >
      {failed ? unavailable : loading}
    </div>
  );
}

'use client';

import { useEffect } from 'react';

const SCRIPT_SRC = 'https://elevenlabs.io/player/audioNativeHelper.js';

export type ElevenLabsAudioNativeProps = {
  publicUserId?: string | null;
  projectId?: string | null;
  size?: 'small' | 'large';
  textColorRgba?: string;
  backgroundColorRgba?: string;
  className?: string;
  placeholder?: string;
};

/**
 * ElevenLabs Audio Native player wrapper.
 * Loads the helper script once per browser session and renders the widget container.
 */
export function ElevenLabsAudioNative({
  publicUserId,
  projectId,
  size = 'small',
  textColorRgba = 'rgba(34, 34, 34, 1)',
  backgroundColorRgba = 'rgba(248, 250, 252, 1)',
  className,
  placeholder = 'Loading the ElevenLabs AudioNative player…',
}: ElevenLabsAudioNativeProps) {
  useEffect(() => {
    if (!publicUserId) return;
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) return;

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    document.body.appendChild(script);
  }, [publicUserId]);

  if (!publicUserId) return null;

  const baseClasses =
    'rounded-xl border border-base-300 bg-base-200/70 shadow-md px-4 py-3';
  const mergedClassName = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      className={mergedClassName}
    >
      <div
        id="elevenlabs-audionative-widget"
        data-height={size === 'small' ? '90' : '120'}
        data-width="100%"
        data-frameborder="no"
        data-scrolling="no"
        data-publicuserid={publicUserId}
        data-playerurl="https://elevenlabs.io/player/index.html"
        data-projectid={projectId ?? undefined}
        data-small={size === 'small' ? 'True' : 'False'}
        data-textcolor={textColorRgba}
        data-backgroundcolor={backgroundColorRgba}
      >
        {placeholder}
      </div>
    </div>
  );
}

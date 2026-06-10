'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiLoader, FiPlay, FiSquare } from 'react-icons/fi';

interface VoiceSamplePlayerProps {
  sampleUrl: string;
}

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error';

export default function VoiceSamplePlayer({ sampleUrl }: VoiceSamplePlayerProps) {
  const tVoices = useTranslations('Voices');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');

  // Stop playback and reset whenever the selected voice changes or on unmount
  useEffect(() => {
    setStatus('idle');
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [sampleUrl]);

  const togglePlayback = async () => {
    if (status === 'playing' || status === 'loading') {
      audioRef.current?.pause();
      audioRef.current = null;
      setStatus('idle');
      return;
    }

    const audio = new Audio(sampleUrl);
    audioRef.current = audio;
    audio.onended = () => setStatus('idle');
    audio.onerror = () => setStatus('error');
    setStatus('loading');
    try {
      await audio.play();
      setStatus('playing');
    } catch {
      setStatus('error');
    }
  };

  const label =
    status === 'error'
      ? tVoices('sampleUnavailable')
      : status === 'playing' || status === 'loading'
        ? tVoices('sampleStop')
        : tVoices('samplePlay');

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <button
        type="button"
        onClick={togglePlayback}
        disabled={status === 'error'}
        className="btn btn-circle btn-primary btn-sm"
        aria-label={label}
      >
        {status === 'loading' ? (
          <FiLoader className="w-4 h-4 animate-spin" />
        ) : status === 'playing' ? (
          <FiSquare className="w-3.5 h-3.5" />
        ) : (
          <FiPlay className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <span className="text-sm text-base-content/70">{label}</span>
    </div>
  );
}

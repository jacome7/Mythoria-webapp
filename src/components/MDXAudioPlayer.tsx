'use client';

import React from 'react';

interface MDXAudioPlayerProps {
  src: string;
  title?: string;
  className?: string;
}

const MDXAudioPlayer: React.FC<MDXAudioPlayerProps> = ({ src, title, className = '' }) => {
  return (
    <div
      className={`my-6 p-4 border border-base-300 rounded-lg bg-base-100 shadow-sm ${className}`}
    >
      {title && <h4 className="text-lg font-semibold mb-2">{title}</h4>}
      <audio controls className="w-full">
        <source src={src} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

export default MDXAudioPlayer;

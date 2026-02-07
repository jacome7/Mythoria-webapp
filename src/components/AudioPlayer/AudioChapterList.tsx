'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  FiBook,
  FiPlay,
  FiPause,
  FiSquare,
  FiLoader,
  FiRewind,
  FiFastForward,
  FiDownload,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { CastButton } from './CastButton';
import { AudioChapter, AudioPlayerState, AudioPlayerActions, CastControlsState } from './types';

interface AudioChapterListProps extends AudioPlayerState, AudioPlayerActions {
  chapters: AudioChapter[];
  formatDuration?: (seconds: number) => string;
  castControls?: CastControlsState;
}

const defaultFormatDuration = (seconds: number): string => {
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const sanitizeFileNamePart = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

const createAudioFileName = (chapterTitle: string, chapterNumber: number): string => {
  const baseName = sanitizeFileNamePart(chapterTitle) || `chapter-${chapterNumber}`;
  return `mythoria-${baseName}.mp3`;
};

export function AudioChapterList({
  chapters,
  currentlyPlaying,
  audioProgress,
  audioLoading,
  audioDurations,
  playbackSpeed,
  playAudio,
  pauseAudio,
  stopAudio,
  downloadAudio,
  setPlaybackSpeed,
  seekAudio,
  skipForward,
  skipBackward,
  castControls,
  formatDuration = defaultFormatDuration,
}: AudioChapterListProps) {
  const tPublicStoryPage = useTranslations('PublicStoryPage');
  const castLabels = useMemo(
    () => ({
      cast: tPublicStoryPage('listen.cast.castButton'),
      stop: tPublicStoryPage('listen.cast.stopCasting'),
      unavailable: tPublicStoryPage('listen.cast.unavailable'),
      castingTo: (device: string) =>
        tPublicStoryPage('listen.cast.castingTo', {
          device: device || tPublicStoryPage('listen.cast.deviceFallback'),
        }),
    }),
    [tPublicStoryPage],
  );

  return (
    <div className="space-y-4">
      {castControls && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-lg border p-3 shadow-sm">
          <div className="text-sm text-gray-700">
            {castControls.isCasting
              ? castLabels.castingTo(castControls.castingDeviceName || '')
              : tPublicStoryPage('listen.cast.ready')}
          </div>
          <CastButton controls={castControls} labels={castLabels} />
        </div>
      )}

      {chapters.map((chapter, index) => {
        const duration = audioDurations?.[index] || chapter.duration || 0;

        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Chapter Image */}
              <div className="flex-shrink-0 mx-auto sm:mx-0">
                {chapter.imageUri ? (
                  <Image
                    src={chapter.imageUri}
                    alt={tPublicStoryPage('listen.chapterImageAlt', { number: index + 1 })}
                    className="w-16 h-16 object-cover rounded-lg"
                    width={64}
                    height={64}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FiBook className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Chapter Info & Controls */}
              <div className="flex-grow w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                  <div className="text-center sm:text-left">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {index + 1}. {chapter.chapterTitle}
                    </h3>
                    {duration > 0 && (
                      <p className="text-sm text-gray-600">
                        {tPublicStoryPage('listen.duration', {
                          duration: formatDuration(duration),
                        })}
                      </p>
                    )}
                  </div>

                  <div className="mt-2">
                    <button
                      onClick={() =>
                        void downloadAudio(
                          index,
                          createAudioFileName(chapter.chapterTitle, index + 1),
                        )
                      }
                      className="btn btn-ghost btn-xs"
                      title={tPublicStoryPage('listen.controls.download')}
                    >
                      <FiDownload className="w-3 h-3" />
                      <span>{tPublicStoryPage('listen.controls.download')}</span>
                    </button>
                  </div>

                  {/* Simple Play Button (only if NOT expanded) */}
                  {!(
                    currentlyPlaying === index ||
                    (audioProgress[index] > 0 && !audioLoading[index])
                  ) && (
                    <div className="mt-2 sm:mt-0 flex justify-center sm:justify-end">
                      {audioLoading[index] ? (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <FiLoader className="animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <button
                          onClick={() => playAudio(index)}
                          className="btn btn-circle btn-primary btn-sm"
                          title={tPublicStoryPage('listen.controls.play')}
                        >
                          <FiPlay className="w-4 h-4 ml-0.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Player UI */}
                {(currentlyPlaying === index ||
                  (audioProgress[index] > 0 && !audioLoading[index])) && (
                  <div className="mt-2 bg-gray-50 p-3 rounded-lg space-y-3">
                    {/* Timeline */}
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        step="0.1"
                        value={(audioProgress[index] / 100) * duration || 0}
                        onChange={(e) => seekAudio(index, Number(e.target.value))}
                        className="range range-xs range-primary flex-grow"
                      />
                      <span className="text-xs text-gray-500 font-mono w-12 text-right">
                        -
                        {formatDuration(
                          Math.max(0, duration - ((audioProgress[index] / 100) * duration || 0)),
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      {/* Play/Pause Button (Left) */}
                      <div>
                        {audioLoading[index] ? (
                          <div className="w-10 h-10 flex items-center justify-center">
                            <FiLoader className="animate-spin text-gray-400" />
                          </div>
                        ) : currentlyPlaying === index ? (
                          <button
                            onClick={() => pauseAudio(index)}
                            className="btn btn-circle btn-primary"
                            title={tPublicStoryPage('listen.controls.pause')}
                          >
                            <FiPause className="w-5 h-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => playAudio(index)}
                            className="btn btn-circle btn-primary"
                            title={tPublicStoryPage('listen.controls.play')}
                          >
                            <FiPlay className="w-5 h-5 ml-0.5" />
                          </button>
                        )}
                      </div>

                      {/* Speed Controls (Right) */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Speed:</span>
                        <select
                          className="select select-bordered select-xs w-20"
                          value={playbackSpeed}
                          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        >
                          {[0.8, 0.9, 1, 1.1, 1.2, 1.5].map((speed) => (
                            <option key={speed} value={speed}>
                              {speed}x
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

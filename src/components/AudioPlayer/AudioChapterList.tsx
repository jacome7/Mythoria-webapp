import React from 'react';
import Image from 'next/image';
import { FiBook, FiPlay, FiPause, FiSquare, FiLoader } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { AudioChapter, AudioPlayerState, AudioPlayerActions } from './types';

interface AudioChapterListProps extends AudioPlayerState, AudioPlayerActions {
  chapters: AudioChapter[];
  formatDuration?: (seconds: number) => string;
}

const defaultFormatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function AudioChapterList({
  chapters,
  currentlyPlaying,
  audioProgress,
  audioLoading,
  playAudio,
  pauseAudio,
  stopAudio,
  formatDuration = defaultFormatDuration,
}: AudioChapterListProps) {
  const tPublicStoryPage = useTranslations('PublicStoryPage');

  return (
    <div className="space-y-4">
      {chapters.map((chapter, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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

            {/* Chapter Info */}
            <div className="flex-grow text-center sm:text-left">
              <h3 className="font-semibold text-lg text-gray-900">
                {index + 1}. {chapter.chapterTitle}
              </h3>
              {chapter.duration > 0 && (
                <p className="text-sm text-gray-600">
                  {tPublicStoryPage('listen.duration', {
                    duration: formatDuration(chapter.duration),
                  })}
                </p>
              )}

              {/* Progress Bar */}
              {audioProgress[index] > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${audioProgress[index]}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Audio Controls */}
            <div className="flex-shrink-0 flex gap-2 mx-auto sm:mx-0">
              {audioLoading[index] ? (
                <div className="w-10 h-10 flex items-center justify-center">
                  <FiLoader className="animate-spin text-gray-400" />
                </div>
              ) : currentlyPlaying === index ? (
                <>
                  <button
                    onClick={() => pauseAudio(index)}
                    className="btn btn-circle btn-primary btn-sm"
                    title={tPublicStoryPage('listen.controls.pause')}
                  >
                    <FiPause className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => stopAudio(index)}
                    className="btn btn-circle btn-outline btn-sm"
                    title={tPublicStoryPage('listen.controls.stop')}
                  >
                    <FiSquare className="w-3 h-3" />
                  </button>
                </>
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
          </div>
        </div>
      ))}
    </div>
  );
}

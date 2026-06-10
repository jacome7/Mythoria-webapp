'use client';
import { BookOpen, ChevronDown, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  imageUri: string | null;
  imageThumbnailUri: string | null;
  htmlContent: string;
  audioUri: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ChapterNavigationProps {
  chapters: Chapter[];
  currentChapter: number;
  onChapterChange: (chapterNumber: number) => void;
}

export default function ChapterNavigation({
  chapters,
  currentChapter,
  onChapterChange,
}: ChapterNavigationProps) {
  const tChapterNavigation = useTranslations('ChapterNavigation');

  const getCurrentChapterTitle = () => {
    if (currentChapter === 0) return tChapterNavigation('storyInformation');
    const chapter = chapters.find((c) => c.chapterNumber === currentChapter);
    return chapter
      ? `${currentChapter}. ${chapter.title}`
      : tChapterNavigation('chapterLabel', { number: currentChapter });
  };

  return (
    <div className="dropdown dropdown-end relative">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
        <BookOpen className="w-4 h-4" />
        <span className="hidden sm:inline ml-2">{getCurrentChapterTitle()}</span>
        <span className="sm:hidden ml-1">
          {currentChapter === 0 ? tChapterNavigation('info') : `${currentChapter}`}
        </span>
        <ChevronDown className="w-3 h-3 ml-1" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu !absolute !right-0 !top-full z-[80] mt-2 w-64 max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-8.5rem)] overflow-y-auto bg-base-100 rounded-box p-2 shadow-xl border border-base-300"
      >
        {/* Story Information */}
        <li className="w-full">
          <button
            onClick={() => onChapterChange(0)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded transition-colors ${currentChapter === 0 ? 'bg-primary/20' : 'hover:bg-base-200'}`}
          >
            <Info className="w-4 h-4 flex-shrink-0" />
            <span className="min-w-0 truncate font-medium text-sm">
              {tChapterNavigation('storyInformation')}
            </span>
          </button>
        </li>

        <li className="w-full">
          <div className="divider my-1"></div>
        </li>

        {/* Chapters */}
        {chapters.map((chapter) => (
          <li key={chapter.id} className="w-full">
            <button
              onClick={() => onChapterChange(chapter.chapterNumber)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                currentChapter === chapter.chapterNumber ? 'bg-primary/20' : 'hover:bg-base-200'
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-medium text-sm">
                {chapter.chapterNumber}. {chapter.title}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

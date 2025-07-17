'use client';
import { 
  FiBook, 
  FiChevronDown, 
  FiInfo
} from 'react-icons/fi';
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
  const t = useTranslations('components.chapterNavigation');
  
  const getCurrentChapterTitle = () => {
    if (currentChapter === 0) return t('storyInformation');
    const chapter = chapters.find(c => c.chapterNumber === currentChapter);
    return chapter ? `${currentChapter}. ${chapter.title}` : t('chapterLabel', { number: currentChapter });
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
        <FiBook className="w-4 h-4" />
        <span className="hidden sm:inline ml-2">
          {getCurrentChapterTitle()}
        </span>
        <span className="sm:hidden ml-1">
          {currentChapter === 0 ? t('info') : `${currentChapter}`}
        </span>
        <FiChevronDown className="w-3 h-3 ml-1" />
      </div>
      <div 
        tabIndex={0} 
        className="dropdown-content bg-base-100 rounded-box z-[1] w-64 p-2 shadow border border-base-300 max-h-96 overflow-y-auto"
      >
        <ul className="space-y-1 w-full">
        {/* Story Information */}
        <li className="w-full">
          <button
            onClick={() => onChapterChange(0)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded transition-colors ${currentChapter === 0 ? 'bg-primary/20' : 'hover:bg-base-200'}`}
          >
            <FiInfo className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium text-sm">{t('storyInformation')}</span>
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
              <span className="font-medium text-sm flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{chapter.chapterNumber}. {chapter.title}</span>
            </button>
          </li>
        ))}
        </ul>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiVolume2 } from 'react-icons/fi';
import ReadingToolbar, { ReadingSettings } from './ReadingToolbar';
import { loadStoryCSS, removeStoryCSS } from '../lib/story-css';
import { getLogoForGraphicalStyle } from '../utils/logo-mapping';
import { toAbsoluteImageUrl } from '../utils/image-url';

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

interface StoryReaderProps {
  storyId: string;
  story: {
    title: string;
    authorName: string;
    dedicationMessage?: string;
    targetAudience?: string;
    graphicalStyle?: string;
    coverUri?: string;
    backcoverUri?: string;
    hasAudio?: boolean;
  };
  chapters: Chapter[];
  currentChapter?: number;
}

export default function StoryReader({ storyId, story, chapters, currentChapter }: StoryReaderProps) {
  const tStoryReader = useTranslations('common.Components.StoryReader');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [readingSettings, setReadingSettings] = useState<ReadingSettings | null>(null);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(false);

  // Determine what to show based on current chapter
  const isFirstPage = !currentChapter || currentChapter === 0;

  const currentChapterData = currentChapter ? chapters.find(ch => ch.chapterNumber === currentChapter) : null;
  const totalChapters = chapters.length;

  // Load appropriate CSS theme based on story metadata
  useEffect(() => {
    if (story?.targetAudience) {
      try {
        loadStoryCSS(story.targetAudience);
      } catch (error) {
        console.warn('Failed to load story CSS, using default styles:', error);
        // Fall back to a default audience style
        loadStoryCSS('all_ages');
      }
    }

    return () => {
      // Clean up CSS when component unmounts
      removeStoryCSS();
    };
  }, [story]);

  // Mark content as loaded after a short delay to ensure CSS is applied
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsContentLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle reading settings changes
  const handleReadingSettingsChange = (settings: ReadingSettings) => {
    setReadingSettings(settings);
  };

  // Navigation functions
  const navigateToChapter = (chapterNumber: number) => {
    if (chapterNumber === 0) {
      // Navigate to first page
      if (window.location.pathname.includes('/p/')) {
        // Public story navigation
        const slug = window.location.pathname.split('/p/')[1].split('/')[0];
        router.push(`/p/${slug}`);
      } else {
        // Private story navigation
        router.push(`/stories/read/${storyId}`);
      }
    } else {
      // Navigate to specific chapter
      if (window.location.pathname.includes('/p/')) {
        // Public story navigation
        const slug = window.location.pathname.split('/p/')[1].split('/')[0];
        router.push(`/p/${slug}/chapter/${chapterNumber}`);
      } else {
        // Private story navigation
        router.push(`/stories/read/${storyId}/chapter/${chapterNumber}`);
      }
    }
  };

  const navigateToNextChapter = () => {
    if (isFirstPage) {
      navigateToChapter(1);
    } else if (currentChapter && currentChapter < totalChapters) {
      navigateToChapter(currentChapter + 1);
    }
  };

  const navigateToPreviousChapter = () => {
    if (currentChapter && currentChapter > 1) {
      navigateToChapter(currentChapter - 1);
    } else if (currentChapter === 1) {
      navigateToChapter(0); // Go to first page
    }
  };

  // Get logo URL based on graphical style
  const logoUrl = getLogoForGraphicalStyle(story.graphicalStyle);

  // Render first page content
  const renderFirstPage = () => (
    <div className="story-container">
      
      {/* Front Cover */}
      {story.coverUri && toAbsoluteImageUrl(story.coverUri) && (
        <>
          <div className="mythoria-front-cover">
            <Image 
              src={toAbsoluteImageUrl(story.coverUri)!} 
              alt="Book Front Cover" 
              className="mythoria-cover-image"
              width={400}
              height={600}
            />
          </div>
          <div className="mythoria-page-break"></div>
        </>
      )}
      
      {/* Author Dedicatory */}
      {story.dedicationMessage && (
        <div className="mythoria-dedicatory">{story.dedicationMessage}</div>
      )}
      
      {/* Author Name */}
      <div className="mythoria-author-name">{tStoryReader('byAuthor', { authorName: story.authorName })}</div>

      {/* Mythoria Message */}
      <div className="mythoria-message">
        <p className="mythoria-message-text">
          {tStoryReader('storyImaginedBy')} <i className="mythoria-author-emphasis">{story.authorName}</i>{tStoryReader('storyImaginedByEnd')}
        </p>
        <p className="mythoria-message-text">{tStoryReader('craftedWith')}</p>
        <Image 
          src={logoUrl} 
          alt="Mythoria Logo" 
          className="mythoria-logo"
          width={400}
          height={200}
        />
      </div>

      <div className="mythoria-page-break"></div>

      {/* Table of Contents */}
      <div className="mythoria-table-of-contents">
        <h2 className="mythoria-toc-title">{tStoryReader('tableOfContents')}</h2>
        <ul className="mythoria-toc-list">
          {chapters.map((chapter) => (
            <li key={chapter.id} className="mythoria-toc-item">
              <button
                onClick={() => navigateToChapter(chapter.chapterNumber)}
                className="mythoria-toc-link"
              >
                {chapter.chapterNumber}. {chapter.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mythoria-page-break"></div>

      {/* Start Reading Button */}
      <div className="text-center py-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => navigateToChapter(1)}
            className="btn btn-primary btn-lg"
            disabled={chapters.length === 0}
          >
            {tStoryReader('startReading')}
          </button>
          
          {/* Listen Button */}
          {story.hasAudio && (
            <button
              onClick={() => {
                // Navigate to listen page
                if (window.location.pathname.includes('/p/')) {
                  // Public story navigation
                  const slug = window.location.pathname.split('/p/')[1].split('/')[0];
                  router.push(`/p/${slug}/listen`);
                } else {
                  // Private story navigation
                  router.push(`/stories/listen/${storyId}`);
                }
              }}
              className="btn btn-outline btn-primary btn-lg flex items-center gap-2"
            >
              <FiVolume2 className="w-5 h-5" />
              {tStoryReader('listen')}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Render chapter content
  const renderChapter = () => {
    if (!currentChapterData) {
      return (
        <div className="story-container">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">{tStoryReader('chapterNotFound')}</h2>
            <p className="text-lg text-base-content/70 mb-6">
              {tStoryReader('chapterNotFoundDescription')}
            </p>
            <button
              onClick={() => navigateToChapter(0)}
              className="btn btn-primary"
            >
              {tStoryReader('backToStory')}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="story-container">
        <div className="mythoria-chapter" id={`chapter-${currentChapterData.chapterNumber}`}>
          <h2 className="mythoria-chapter-title">{currentChapterData.title}</h2>
          
          {/* Chapter Image */}
          {currentChapterData.imageUri && toAbsoluteImageUrl(currentChapterData.imageUri) && (
            <div className="mythoria-chapter-image">
              <Image 
                src={toAbsoluteImageUrl(currentChapterData.imageUri)!} 
                alt={tCommon('altTexts.chapterIllustration', { number: currentChapterData.chapterNumber })} 
                className="mythoria-chapter-img"
                width={600}
                height={400}
              />
            </div>
          )}
          
          {/* Chapter Content */}
          <div 
            className="mythoria-chapter-content"
            dangerouslySetInnerHTML={{ __html: currentChapterData.htmlContent }}
          />

        </div>

        <div className="mythoria-page-break"></div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center py-2 px-4 md:px-2 gap-2">
          <div className="flex-shrink-0">
            {(currentChapter && currentChapter > 1) || currentChapter === 1 ? (
              <button
                onClick={navigateToPreviousChapter}
                className="btn btn-outline btn-sm text-xs md:text-sm"
              >
                {currentChapter === 1 ? '← Back' : `← Ch. ${currentChapter - 1}`}
              </button>
            ) : (
              <div></div>
            )}
          </div>
          
          <div className="text-center flex-shrink-0 min-w-0">
            <span className="text-xs md:text-sm text-base-content/70 whitespace-nowrap">
              Ch. {currentChapter} of {totalChapters}
            </span>
          </div>
          
          <div className="flex-shrink-0">
            {currentChapter && currentChapter < totalChapters ? (
              <button
                onClick={navigateToNextChapter}
                className="btn btn-primary btn-sm text-xs md:text-sm"
              >
                Ch. {currentChapter + 1} →
              </button>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Table of Contents Modal
  const renderTableOfContentsModal = () => (
    showTableOfContents && (
      <div className="modal modal-open">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">{tStoryReader('tableOfContents')}</h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  navigateToChapter(0);
                  setShowTableOfContents(false);
                }}
                className="btn btn-ghost btn-sm w-full justify-start"
              >
                {tStoryReader('coverAndIntroduction')}
              </button>
            </li>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <button
                  onClick={() => {
                    navigateToChapter(chapter.chapterNumber);
                    setShowTableOfContents(false);
                  }}
                  className={`btn btn-ghost btn-sm w-full justify-start ${
                    currentChapter === chapter.chapterNumber ? 'bg-primary/20' : ''
                  }`}
                >
                  {chapter.chapterNumber}. {chapter.title}
                </button>
              </li>
            ))}
          </ul>
          <div className="modal-action">
            <button
              onClick={() => setShowTableOfContents(false)}
              className="btn btn-sm"
            >
              {tCommon('Actions.close')}
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="story-reader min-h-screen px-0 bg-base-100">
      {/* Reading Toolbar */}
      <ReadingToolbar 
        onSettingsChange={handleReadingSettingsChange}
        chapters={chapters}
        currentChapter={currentChapter || 0}
        onChapterChange={navigateToChapter}
      />
      
      {/* Story Content */}
      <div 
        className="mythoria-story-scope"
        style={{
          fontSize: readingSettings?.fontSize ? `${readingSettings.fontSize}%` : undefined,
          lineHeight: readingSettings?.lineHeight ? `${readingSettings.lineHeight}%` : undefined
        }}
      >
        <div className="w-full px-0 md:px-0 py-0">
          {!isContentLoaded ? (
            // Loading state
            <div className="flex flex-col items-center justify-center py-16">
              <div className="loading loading-spinner loading-lg mb-4"></div>
              <p className="text-lg text-base-content/70">{tStoryReader('preparing')}</p>
            </div>
          ) : (
            // Story content
            <article className="mythoria-story-content prose prose-lg max-w-none p-0 md:p-0 m-0">
              {isFirstPage ? renderFirstPage() : renderChapter()}
            </article>
          )}
        </div>
      </div>

      {/* Table of Contents Modal */}
      {renderTableOfContentsModal()}

      <style jsx>{`
        /* Base story reader styles */
        .story-reader {
          transition: all 0.3s ease;
        }
        
        /* Remove default prose styles that might conflict with our custom CSS */
        :global(.story-content.prose) {
          max-width: none;
          color: inherit;
        }
        
        /* Ensure mythoria styles take precedence */
        :global(.mythoria-story-scope) {
          /* This will scope our story-specific styles */
        }
        
        /* Custom button styles for TOC links */
        .mythoria-toc-link {
          background: none;
          border: none;
          color: inherit;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font: inherit;
        }
        
        .mythoria-toc-link:hover {
          color: #0066cc;
        }
      `}</style>
    </div>
  );
}

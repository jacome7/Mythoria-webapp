'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { FiLoader, FiAlertCircle, FiEdit3, FiPrinter } from 'react-icons/fi';
import StoryReader from '@/components/StoryReader';
import PublicStoryRating from '@/components/PublicStoryRating';

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

interface PublicChapterData {
  success: boolean;
  story: {
    storyId: string;
    title: string;
    synopsis?: string;
    targetAudience?: string;
    graphicalStyle?: string;
    createdAt: string;
    isPublic: boolean;
    slug: string;
    authorName: string;
    dedicationMessage?: string;
    coverUri?: string;
    backcoverUri?: string;
  };
  chapters: Chapter[];
  currentChapter: Chapter;
  accessLevel: 'public';
  error?: string;
}

export default function PublicChapterPage() {
  const params = useParams();
  const locale = useLocale();
  const tPublicStoryPage = useTranslations('PublicStoryPage');
  const tCommon = useTranslations('common');
  const slug = params.slug as string;
  const chapterNumber = parseInt(params.chapterNumber as string);
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicChapterData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicChapter = async () => {
      try {
        const response = await fetch(`/api/p/${slug}/chapter/${chapterNumber}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result);
        } else {
          setError(result.error || tPublicStoryPage('errors.failedToLoadChapter'));
        }
      } catch (err) {
        console.error('Error fetching public chapter:', err);
        setError(tPublicStoryPage('errors.failedToLoadChapter'));
      } finally {
        setLoading(false);
      }
    };

    if (slug && chapterNumber) {
      fetchPublicChapter();
    }
  }, [slug, chapterNumber]);

  // Set page title when data is loaded
  useEffect(() => {
    if (data?.story && data?.currentChapter) {
      const story = data.story;
      const chapter = data.currentChapter;
      document.title = tPublicStoryPage('metadata.chapterPageTitle', { 
        title: story.title, 
        number: chapter.chapterNumber 
      });
    }
  }, [data, tPublicStoryPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <FiLoader className="animate-spin w-8 h-8 text-primary" />
          <p className="text-lg">{tCommon('Loading.default')}...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiAlertCircle className="w-16 h-16 text-error mx-auto" />
          <h1 className="text-2xl font-bold">{tPublicStoryPage('chapterNotFound')}</h1>
          <p className="text-base-content/70">{error || tPublicStoryPage('chapterNotAvailable')}</p>
          <button
            onClick={() => window.history.back()}
            className="btn btn-primary"
          >
            {tCommon('Actions.goBack')}
          </button>
        </div>
      </div>
    );
  }

  const story = data.story;
  const chapters = data.chapters;
  const isLastChapter = chapterNumber === chapters.length;

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 p-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{story.title}</h1>
              <p className="text-sm text-base-content/70">
                {tPublicStoryPage('chapter')} {chapterNumber}: {data.currentChapter.title}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Story Reader */}
      <StoryReader
        storyId={story.storyId}
        story={{
          title: story.title,
          authorName: story.authorName,
          dedicationMessage: story.dedicationMessage,
          targetAudience: story.targetAudience,
          graphicalStyle: story.graphicalStyle,
          coverUri: story.coverUri,
          backcoverUri: story.backcoverUri,
        }}
        chapters={chapters}
        currentChapter={chapterNumber}
      />

      {/* Last Chapter CTAs */}
      {isLastChapter && (
        <div className="max-w-4xl mx-auto p-4 print:hidden">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mt-8 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
              {tPublicStoryPage('lastChapter.enjoyedTitle')}
            </h3>
            <p className="text-gray-700 text-center mb-6">
              {tPublicStoryPage('lastChapter.enjoyedDesc')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`/${locale}`}
                className="btn btn-primary flex items-center gap-2"
              >
                <FiEdit3 className="w-4 h-4" />
                {tPublicStoryPage('actions.createOwnStory')}
              </a>
              
              <a
                href={`/${locale}/stories/print/${story.storyId}`}
                className="btn btn-secondary flex items-center gap-2"
              >
                <FiPrinter className="w-4 h-4" />
                {tPublicStoryPage('actions.orderPrintedBook')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Story Rating */}
      <div className="max-w-4xl mx-auto p-4 print:hidden">
        <PublicStoryRating storyId={story.storyId} />
      </div>
    </div>
  );
}

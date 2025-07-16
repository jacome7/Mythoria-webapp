'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle, FiUser, FiCalendar, FiTag } from 'react-icons/fi';
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
  const t = useTranslations('PublicStoryPage');
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
          setError(result.error || 'Failed to load chapter');
        }
      } catch (err) {
        console.error('Error fetching public chapter:', err);
        setError('Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };

    if (slug && chapterNumber) {
      fetchPublicChapter();
    }
  }, [slug, chapterNumber]);

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
          <h1 className="text-2xl font-bold">{t('chapterNotFound')}</h1>
          <p className="text-base-content/70">{error || t('chapterNotAvailable')}</p>
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

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 p-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{story.title}</h1>
              <p className="text-sm text-base-content/70">
                Chapter {chapterNumber}: {data.currentChapter.title}
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

      {/* Story Rating */}
      <div className="max-w-4xl mx-auto p-4 print:hidden">
        <PublicStoryRating storyId={story.storyId} />
      </div>
    </div>
  );
}

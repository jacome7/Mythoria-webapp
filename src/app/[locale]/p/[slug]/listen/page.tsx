'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle, FiVolume2, FiArrowLeft } from 'react-icons/fi';
import { useAudioPlayer, AudioChapterList, hasAudiobook, getAudioChapters } from '@/components/AudioPlayer';

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

interface PublicStoryData {
  success: boolean;
  story: {
    storyId: string;
    title: string;
    authorName: string;
    synopsis?: string;
    audiobookUri?: Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }> | Record<string, string>;
    targetAudience?: string;
    graphicalStyle?: string;
    createdAt: string;
    hasAudio?: boolean;
    slug?: string;
  };
  chapters: Chapter[];
  accessLevel: 'public';
  error?: string;
}

export default function PublicListenPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('PublicStoryPage');
  const tCommon = useTranslations('common');
  const slug = Array.isArray(params?.slug)
    ? (params?.slug[0] ?? '')
    : (params?.slug as string | undefined) ?? '';
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicStoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio player hook
  const audioPlayer = useAudioPlayer({
    audioEndpoint: `/api/p/${slug}/audio`,
    onError: (errorMessage) => setError(errorMessage),
  });

  useEffect(() => {
    if (!slug) return;

    const fetchPublicStory = async () => {
      try {
        console.log('[Public Listen Page] Fetching story for slug:', slug);
        const response = await fetch(`/api/p/${slug}`);
        console.log('[Public Listen Page] Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Public Listen Page] Response error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Public Listen Page] Response data:', result);

        if (result.success) {
          setData(result);
          
          // Check if story has audio
          if (!result.story.hasAudio) {
            setError(t('listen.audioNotAvailable'));
          }
          
          console.log('[Public Listen Page] Story loaded successfully');
        } else {
          console.error('[Public Listen Page] API returned error:', result.error);
          setError(result.error || t('errors.notFound'));
        }
      } catch (err) {
        console.error('[Public Listen Page] Error fetching public story:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`${t('errors.failedToLoadStory')}: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Set page title when data is loaded
  useEffect(() => {
    if (data?.story) {
      const story = data.story;
      document.title = t('metadata.listenPageTitle', { title: story.title });
    }
  }, [data, t]);

  const navigateBackToStory = () => {
    router.push(`/${locale}/p/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <FiLoader className="animate-spin text-4xl text-primary mx-auto" />
          <h2 className="text-xl font-semibold">{t('loading.title')}</h2>
          <p className="text-gray-600">{t('loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <FiAlertCircle className="text-4xl text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">{t('errors.notFound')}</h2>
          <p className="text-gray-600">{error || t('errors.notFoundDesc')}</p>
          
          <div className="space-y-2">
            <button
              onClick={navigateBackToStory}
              className="btn btn-primary btn-sm"
            >
              {tCommon('Actions.goBack')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { story } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={navigateBackToStory}
                className="btn btn-ghost btn-sm"
              >
                <FiArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{tCommon('Actions.backToStory')}</span>
                <span className="sm:hidden">{t('listen.backMobile')}</span>
              </button>
              
              <h1 className="text-xl font-semibold text-gray-900 text-center flex-1 mx-4">
                <FiVolume2 className="w-5 h-5 inline mr-2" />
                {t('listen.title', { title: story.title })}
              </h1>
              
              <div className="w-20"></div> {/* Spacer for centering */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Audio Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {hasAudiobook(data?.story?.audiobookUri) ? (
            <AudioChapterList 
              chapters={getAudioChapters(
                data.story.audiobookUri, 
                data.chapters, 
                (number) => t('listen.chapterFallback', { number })
              )}
              {...audioPlayer}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('listen.audioNotAvailableTitle')}</h3>
              <p className="text-gray-600">
                {t('listen.audioNotAvailableDesc')}
              </p>
              <button
                onClick={navigateBackToStory}
                className="btn btn-primary mt-4"
              >
                {t('listen.backToStory')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FiLoader, FiAlertCircle, FiUser, FiCalendar, FiTag, FiEye, FiPrinter, FiVolume2, FiEdit3 } from 'react-icons/fi';
import PublicStoryRating from '@/components/PublicStoryRating';
import StoryReader from '@/components/StoryReader';

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
    htmlUri?: string;
    pdfUri?: string;
    audiobookUri?: Array<{
      chapterTitle: string;
      audioUri: string;
      duration: number;
      imageUri?: string;
    }> | Record<string, string>;
    targetAudience?: string;
    graphicalStyle?: string;
    novelStyle?: string;
    plotDescription?: string;
    createdAt: string;
    isPublic: boolean;
    dedicationMessage?: string;
    coverUri?: string;
    backcoverUri?: string;
    slug?: string;
    hasAudio?: boolean;
  };
  chapters: Chapter[];
  accessLevel: 'public';
  error?: string;
}

export default function PublicStoryPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations('PublicStoryPage');
  const tCommon = useTranslations('common');
  const slug = params.slug as string;
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicStoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;    const fetchPublicStory = async () => {
      try {
        const response = await fetch(`/api/p/${slug}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Public Page] Response error:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('[Public Page] Response data:', result);
        if (result.success) {
          // Story data fetched successfully
          setData(result);
          
        } else {
          console.error('[Public Page] API returned error:', result.error);
          setError(result.error || 'Story not found');
        }
      } catch (err) {
        console.error('[Public Page] Error fetching public story:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load story: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStory();
  }, [slug]);
  // Generate metadata for the page
  useEffect(() => {
    if (data?.story) {
      const story = data.story;
      // Use localized page title template
      document.title = t('metadata.pageTitle', { title: story.title });
      
      // Set meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      const description = story.synopsis || story.plotDescription || t('metadata.defaultDescription', { title: story.title });
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = description;
        document.head.appendChild(meta);
      }

      // Set Open Graph tags
      const setMetaTag = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      const baseUrl = window.location.origin;
      setMetaTag('og:title', story.title);
      setMetaTag('og:description', description);
      setMetaTag('og:type', 'article');
      setMetaTag('og:url', window.location.href);
      setMetaTag('og:site_name', 'Mythoria');
      setMetaTag('og:image', `${baseUrl}/api/og/story/${slug}`);
      setMetaTag('og:image:width', '1200');
      setMetaTag('og:image:height', '630');
      setMetaTag('og:image:alt', t('metadata.coverImageAlt', { title: story.title }));

      // Twitter Card tags
      const setTwitterTag = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      setTwitterTag('twitter:card', 'summary_large_image');
      setTwitterTag('twitter:title', story.title);
      setTwitterTag('twitter:description', description);
      setTwitterTag('twitter:image', `${baseUrl}/api/og/story/${slug}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, slug]);
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
            <a
              href={`/${locale}`}
              className="btn btn-primary btn-sm"
            >
              {tCommon('Actions.goToHomepage')}
            </a>
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
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-4">
              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900">{story.title}</h1>
              
              {/* Actions - Mobile responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                {/* Tags and Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`/${locale}/stories/print/${story.storyId}`}
                    className="btn btn-primary btn-sm flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <FiPrinter className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden min-[480px]:inline">{t('actions.orderPrint')}</span>
                    <span className="min-[480px]:hidden">{t('actions.print')}</span>
                  </a>
                  {story.hasAudio && (
                    <a
                      href={`/${locale}/p/${slug}/listen`}
                      className="btn btn-secondary btn-sm flex items-center gap-2 text-xs sm:text-sm"
                    >
                      <FiVolume2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden min-[480px]:inline">{t('actions.listen')}</span>
                      <span className="min-[480px]:hidden">{t('actions.listenMobile')}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mt-4">
              <div className="flex items-center gap-1">
                <FiUser />
                <span>{t('labels.by')} {story.authorName || t('labels.unknownAuthor')}</span>
              </div>
                <div className="flex items-center gap-1">
                <FiCalendar />
                <span>{new Date(story.createdAt).toLocaleDateString(locale)}</span>
              </div>              
              {story.targetAudience && (
                <div className="flex items-center gap-1">
                  <FiTag />
                  <span>{story.targetAudience.replace('_', ' ')}</span>
                </div>
              )}
              
              {story.graphicalStyle && (
                <div className="flex items-center gap-1">
                  <FiEye />
                  <span className="capitalize">{story.graphicalStyle.replace('_', ' ')}</span>
                </div>
              )}
              
              {story.novelStyle && (
                <div className="flex items-center gap-1">
                  <FiTag />
                  <span className="capitalize">{story.novelStyle.replace('_', ' ')}</span>
                </div>
              )}
            </div>
            
            {(story.synopsis || story.plotDescription) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold text-gray-900 mb-2">{t('labels.synopsis')}</h3>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {story.synopsis || story.plotDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Story Content */}
      <div className="py-6">
        {data?.chapters && data.chapters.length > 0 ? (
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
            chapters={data.chapters}
            currentChapter={0} // Start at first page/cover
          />
        ) : (
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <FiAlertCircle className="text-4xl text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t('errors.contentNotAvailable')}</h3>
                <p className="text-gray-600">
                  {t('errors.contentNotAvailableDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Story Complete CTAs */}
        <div className="container mx-auto px-4 mt-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200 print:hidden">
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                {t('storyComplete.enjoyedTitle')}
              </h3>
              <p className="text-gray-700 text-center mb-6">
                {t('storyComplete.enjoyedDesc')}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={`/${locale}`}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <FiEdit3 className="w-4 h-4" />
                  {t('actions.createOwnStory')}
                </a>
                
                <a
                  href={`/${locale}/stories/print/${story.storyId}`}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <FiPrinter className="w-4 h-4" />
                  {t('actions.orderPrintedBook')}
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Story Rating Section */}
        <div className="container mx-auto px-4 mt-8">
          <div className="max-w-4xl mx-auto">
            <PublicStoryRating
              storyId={story.storyId}
              onRatingSubmitted={(rating) => {
                console.log('Rating submitted:', rating);
              }}
            />
          </div>
        </div>
      </div>

      {/* Custom CSS for responsive design */}
      <style jsx>{`
        @media (max-width: 480px) {
          .btn-sm {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
          
          .badge {
            padding: 0.25rem 0.5rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
